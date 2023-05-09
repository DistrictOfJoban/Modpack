# Joban Modpack
This is the modpack for The District of Joban server.  
You may also download the zip manually in the releases section

## Cycle
A list of mods that should be automatically updated with the modpack are placed in `modpack.json`
Other miscellaneous files and mods that cannot be updated via Modrinth are served in the `override` folder, serving as a "base".

A cron job is scheduled so GitHub action runs every 2 hours to check if there's any update via modrinth in the `modpack.json`. (It will compare against the last run via `cache.json`)  
When found, it will automatically download the necessary mod, and repackage it into a new `modpack.zip`.
After that, it will commit cache.json with the new hashes back to the repo, and make a release with the modpack.

## License
This project is licensed under the MIT License.
