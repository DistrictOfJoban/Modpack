const archiver = require('archiver');
const modpack = require('./modpack.json');
const fs = require('fs');
const { https } = require('follow-redirects');
const path = require('path');

const BASE_PATH = "./override";
const CACHE_FILE = "./cache.json";
const UA_STRING = "joban_modpack_updater"
const MODRINTH_URL = "https://api.modrinth.com/v2";

(async() => {
    if(modpack) {
        let mc_version = modpack.minecraft_version;
        let modloader = modpack.modloader;
        let mods = modpack.list;
        let cacheData = {};
        
        if(fs.existsSync(CACHE_FILE)) {
            cacheData = JSON.parse(fs.readFileSync(CACHE_FILE));
        }
        
        let modToBeDownloaded = [];
        
        for(let mod of mods) {
            console.log(`Checking for ${mod}.`);
            let modData = await lookupModFiles(mc_version, modloader, mod);
            let major_mc_version = mc_version.split(".");
            major_mc_version.pop();
            major_mc_version = major_mc_version.join(".");
            let suitableVersions = modData.filter(e => {
                return (e.game_versions.includes(mc_version) || e.game_versions.includes(major_mc_version)) && e.loaders.includes(modloader)
                
            });
            suitableVersions.sort((a, b) => -a.date_published.localeCompare(b.date_published));
            let latestVersion = suitableVersions[0];
            
            if(latestVersion != null) {
                let availableFiles = latestVersion.files.filter(e => latestVersion.files.length == 1 || e.primary);
                if(availableFiles.length == 0) {
                    console.log(`No suitable file found for mod ${mod}.`);
                    continue;
                }
                let targetFile = availableFiles[0];
                let hashes = targetFile.hashes;
                let downloadURL = targetFile.url;
                let needDownload = true;
                
                if(cacheData[mod] != null) {
                    let cachedData = cacheData[mod];
                    if(cachedData.hashes.sha1 == hashes.sha1 && cachedData.hashes.sha512 == hashes.sha512) {
                        needDownload = false;
                    } else {
                        cacheData[mod].hashes = {};
                        cacheData[mod].hashes.sha1 = hashes.sha1;
                        cacheData[mod].hashes.sha512 = hashes.sha512;
                        cacheData[mod].url = downloadURL;
                    }
                } else {
                    cacheData[mod] = {};
                    cacheData[mod].url = downloadURL;
                    cacheData[mod].hashes = hashes;
                }
                
                let versionObj = latestVersion;
                versionObj.slug = mod;
                modToBeDownloaded.push({
                    hasUpdate: needDownload,
                    slug: mod,
                    hashes: hashes,
                    url: downloadURL,
                    size: targetFile.size
                });
            }
        }
        
        if(modToBeDownloaded.filter(e => e.hasUpdate).length == 0) {
            console.log("No new mod found for repacking.");
            process.exit(1);
        }
        
        let tempModFolder = path.join(__dirname, 'tempMods');
        
        if(!fs.existsSync(tempModFolder)) {
            fs.mkdirSync(tempModFolder);
        }
        
        let dlPromises = modToBeDownloaded.map(modData => {
            let destination = path.join(tempModFolder, `${modData.slug}.jar`)
            return new Promise((resolve, reject) => {
                const file = fs.createWriteStream(destination);
                const request = https.get(modData.url, function(response) {
                    response.pipe(file);
                    
                    file.on("finish", () => {
                        file.close();
                        resolve();
                    });
                });
            });
        });
        
        console.log(`New Mod / Mod update has been found, downloading ${modToBeDownloaded.length} mod(s)...`);
        await Promise.all(dlPromises);
        
        //Prep for packaging
        let tempPkgPath = path.join(__dirname, `tempBase`);
        let dotMCFolder = path.join(tempPkgPath, ".minecraft");
        let modsFolder = path.join(dotMCFolder, "mods")
        fs.cpSync(BASE_PATH, tempPkgPath, { recursive: true });
        fs.cpSync(tempModFolder, modsFolder, { recursive: true });
        await generateZipArchive(tempPkgPath, 'modpack.zip');
        fs.rmSync(tempModFolder, { recursive: true, force: true });
        fs.rmSync(tempPkgPath, { recursive: true, force: true });
        
        process.exit(0);
    }
})();

async function lookupModFiles(mc, loader, slug) {
    let resp = await fetch(`${MODRINTH_URL}/project/${slug}/version`, {
        headers: {
            'User-Agent': UA_STRING
        }
    });
    return await resp.json();
}

async function generateZipArchive(path, destPath) {
    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(destPath);
        const archive = archiver('zip', { zlib: { level: 9 }});
        
        output.on('close', function() {
            console.log('Modpack archive generated.');
            resolve();
        });
        
        archive.on('error', function(err) {
            throw err;
        });
        
        archive.pipe(output);
        archive.directory(path, false);
        archive.finalize();
    })
}

function writeCacheFile(cacheData) {
    let json = JSON.stringify(cacheData, null, 2);
    fs.writeFileSync(CACHE_FILE, json);
}
