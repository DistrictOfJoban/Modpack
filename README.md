# Joban Modpack
This is the modpack for The District of Joban server.  
The modpack zip is located in `modpack.zip`

## Cycle
A list of mods that should be automatically updated with the modpack are placed in `modpack.json`
Other miscellaneous files and mods that cannot be updated via Modrinth are served in the `override` folder, serving as a "base".

A cron job is scheduled so GitHub action runs every 2 hours to check if there's any update via modrinth in the `modpack.json`.  
When found, it will automatically download the necessary mod, repackage it into a new `modpack.zip` and self commit.

## License
This project is licensed under the MIT License.
