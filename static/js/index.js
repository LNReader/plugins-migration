const isUrlAbsolute = (url) => {
    if (url) {
      if (url.indexOf('//') === 0) {
        return true;
      } // URL is protocol-relative (= absolute)
      if (url.indexOf('://') === -1) {
        return false;
      } // URL has no protocol (= relative)
      if (url.indexOf('.') === -1) {
        return false;
      } // URL does not contain a dot, i.e. no TLD (= relative, possibly REST)
      if (url.indexOf('/') === -1) {
        return false;
      } // URL does not contain a single slash (= relative)
      if (url.indexOf(':') > url.indexOf('/')) {
        return false;
      } // The first colon comes after the first slash (= relative)
      if (url.indexOf('://') < url.indexOf('.')) {
        return true;
      } // Protocol is defined before first dot (= absolute)
    }
    return false; // Anything else must be relative
  };
  

let allPlugins = {};
fetch('https://raw.githubusercontent.com/LNReader/lnreader-sources/dist/.dist/plugins.min.json')
    .then((res) => res.json())
    .then(data => {
        allPlugins = data;
        document.getElementById('plugins-loading').classList.add('d-none');
        document.querySelector('input#backup-file-input').disabled = false;
    });

let oldNovels = [];

const backupInput = document.getElementById('backup-file-input');
backupInput.addEventListener('change', (e) => {
    const file = backupInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            oldNovels = JSON.parse(e.target.result);
            migrate(oldNovels);
        }catch (e){
            alert(e);
        }
    }
    reader.readAsText(file);
});

function findSuitedPlugin(novel){
    let novelSiteUrl;
    try {
        novelSiteUrl = new URL(novel.sourceUrl);
    } catch {
        return undefined;
    }
    const novelSiteDomain = novelSiteUrl.hostname.replace(/www\./, '');
    for(let lang in allPlugins){
        for (let plugin of allPlugins[lang]){
            const pluginSiteUrl = new URL(plugin.site);
            const pluginSiteDomain = pluginSiteUrl.hostname.replace(/www\./, '');
            if (pluginSiteDomain === novelSiteDomain){
                return plugin;
            }
        }
    }

    return undefined;
}

function migrate() {
    const migratedNovels = [];
    const unmigratedNovels = [];
    const requiredPlugins = new Set();
    for(let oldNovel of oldNovels){
        const plugin = findSuitedPlugin(oldNovel);
        let novelUrl = oldNovel.novelUrl;
        if(!isUrlAbsolute(novelUrl)){
            novelUrl = oldNovel.sourceUrl.replace(/\/$/,'') + '/' + oldNovel.novelUrl.replace(/^\//,'');
        }
        if(plugin){
            migratedNovels.push({
                id: oldNovel.novelId,
                url: novelUrl,
                pluginId: plugin.id,
                name: oldNovel.novelName,
                cover: oldNovel.novelCover,
                summary: oldNovel.novelSummary,
                author: oldNovel.author,
                artist: oldNovel.artist,
                status: oldNovel.status,
                genres: oldNovel.genre,
                inLibrary: oldNovel.followed,
                isLocal: 0,
            });
            requiredPlugins.add(plugin);
        }else{
            unmigratedNovels.push(oldNovel);
        }
    }

    // download migrated novels
    if(migratedNovels.length){

        const migratedBlob = new Blob([JSON.stringify(migratedNovels)], {type: 'application/json'});
        const migratedBtn = document.querySelector('a#download-btn');
    
        migratedBtn.download = 'migrated-backup.json';
        migratedBtn.href = window.URL.createObjectURL(migratedBlob);
        migratedBtn.classList.remove('disabled');
    }
    

    // the remain
    if(unmigratedNovels.length){
        const unmigratedBlob = new Blob([JSON.stringify(unmigratedNovels)], {type: 'application/json'});
        const unmigratedBtn = document.querySelector('a#unmigrated-download-btn');
        unmigratedBtn.download = 'unmigrated-backup.json';
        unmigratedBtn.href = window.URL.createObjectURL(unmigratedBlob);
        unmigratedBtn.classList.remove('d-none');
    }
    const table = document.getElementById('plugins-table-content');
    table.innerHTML = '';
    index = 1;
    if(requiredPlugins.size > 0){
        requiredPlugins.forEach((plugin) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <th scope="row">${index}</th>
                <td>${plugin.name}</td>
                <td>${plugin.id}</td>
                <td><img src="${plugin.iconUrl}" width="40" height="40"></td>
                <td>${plugin.lang}</td>
            `
            table.append(row);
            index++;
        })
    }
}
