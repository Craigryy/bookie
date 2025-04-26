//index.js - My CLI tool for managing notes and files

const { Command } = require("commander")
const Table = require('cli-table3');
const {Folder, File, sequelize} = require('./models');
const { Op } = require("sequelize");

// Main program
const program = new Command();

// Make sure DB is set up before we do anything
async function setupDB() {
  try {
    console.log('Setting up the database...');
    await sequelize.sync();
    console.log('Database ready to go!');
  } catch (err) {
    console.error('DB setup failed:', err);
    process.exit(1); // bail out if db fails
  }
}

// A function to Shows errors
function showError(error, context) {
  console.error(`\n❌ Error ${context}: ${error.message}`);

  if (error.name === 'SequelizeValidationError') {
    error.errors.forEach(err => {
      console.error(`  - ${err.message}`);
    });
  }
  console.error('');
}

// Display help info
program
    .command('help')
    .description('Display all commands')
    .action(() => {
        try {
            // Nice looking table for commands
            const cmdTable = new Table({
                head: ['Command', 'Description'],
                style: {
                    head: ['cyan', 'bold'],
                    border: ['grey']
                }
            });

            // All my commands
            cmdTable.push(
                ['create-folder', 'Create a new folder'],
                ['list-folders', 'List all folders and files'],
                ['update-folder', 'Update a folder'],
                ['delete-folder', 'Delete a folder and all its files'],
                ['add-file', 'Add a new file to a folder'],
                ['delete-file', 'Delete a file'],
                ['help', 'Display all commands'],
                ['exit', 'Exit the program']
            );

            console.log('\n📚 Bookie CLI - Available Commands:\n');
            console.log(cmdTable.toString());
            console.log('\n');
        } catch (error) {
            showError(error, "displaying help");
        }
    });

// Create a new folder
program
    .command('create-folder')
    .description('Create a new folder')
    .option('-n, --name <name>', 'Name of the folder')
    .option('-d, --notes <notes>', 'Notes about the folder')
    // opts is short for options
    .action(async (opts) => {
        try {
            // check if there is a name
            if (!opts.name || opts.name.trim() === '') {
                console.error('\n❌ Hey, I need an actual folder name to work with!\n');
                return;
            }

            // check if there are notes
            if (!opts.notes) {
                console.error('\n❌ Please add some notes about what this folder is for.\n');
                return;
            }

            // Make sure we don't create duplicate folders
            const existingFolder = await Folder.findOne({ where: { name: opts.name } });
            if (existingFolder) {
                console.error(`\n❌ You already have a folder called "${opts.name}". Try another name.\n`);
                return;
            }

            // Create the folder
            const folder = await Folder.create({
                name: opts.name,
                notes: opts.notes
            });

            console.log(`\n✅ Created folder "${opts.name}" with ID ${folder.id}!\n`);
        } catch (error) {
            showError(error, "creating folder");
        }
    });

// A simple command to list all folders
program
    .command('list-folders')
    .description('List all folders')
    .action(async ()=>{
        try {
            // Fetch all folders with their associated files
            const folders = await Folder.findAll({
                include: ['files']
            });

            // check if there are any folders
            if (folders.length === 0) {
                console.log('\n📂 No folders found. Create one using the "create-folder" command.\n');
                return;
            }

            console.log('\n📚 Your Folders and Files:\n');

            // Create a table for folders
            const folderTable = new Table({
                head: ['ID', 'Folder Name', 'Notes', 'Files'],
                style: {
                    head: ['cyan', 'bold'],
                    border: ['grey']
                },
                colWidths: [5, 20, 30, 30]
            });

            // Add each folder to the table
            folders.forEach(folder => {
                const fileTitles = folder.files && folder.files.length > 0
                    ? folder.files.map(file => file.title).join(', ')
                    : 'No files';

                folderTable.push([
                    folder.id,
                    folder.name,
                    folder.notes || 'No notes',
                    fileTitles
                ]);
            });

            console.log(folderTable.toString());
            console.log('\n');
        } catch (error) {
            showError(error, "listing folders");
        }
    });

// A simple command to update a folder
program
    .command('update-folder')
    .description('Update a folder')
    .option('-i, --id <id>', 'ID of the folder to update')
    .option('-n, --name <name>', 'New name for the folder')
    .option('-d, --notes <notes>', 'New notes for the folder')
    .action(async (opts)=>{
        try {
            // Check if ID is provided
            if (!opts.id) {
                console.error('\n❌ Folder ID is required. Please provide the ID of the folder to update\n');
                return;
            }

            // Check if ID is valid
            if (isNaN(parseInt(opts.id))) {
                console.error('\n❌ Invalid folder ID. Please provide a valid numeric ID\n');
                return;
            }

            // Check if folder exists by ID (primary key)
            const folder = await Folder.findByPk(opts.id);
            if (!folder) {
                console.error(`\n❌ Oops, folder with ID ${opts.id} not found. Please check the folder ID\n`);
                return;
            }

            // Check if at least one update field is provided
            if (!opts.name && !opts.notes) {
                console.error('\n❌ Please provide at least a new name or notes to update\n');
                return;
            }

            // If name is provided, check if it's not empty
            if (opts.name && opts.name.trim() === '') {
                console.error('\n❌ Oops, folder name cannot be empty\n');
                return;
            }

            // If name is provided, check if it's already taken by another folder
            if (opts.name) {
                const existingFolder = await Folder.findOne({
                    where: {
                        name: opts.name,
                        id: { [Op.ne]: folder.id } // Exclude the current folder
                    }
                });

                if (existingFolder) {
                    console.error(`\n❌ Oops, a folder named "${opts.name}" already exists. Please use a different name.\n`);
                    return;
                }
            }

            // Update the folder with only the fields that are provided
            const updateData = {};
            if (opts.name) updateData.name = opts.name;
            if (opts.notes) updateData.notes = opts.notes;

            await folder.update(updateData);

            console.log(`\n✅ Folder with ID ${folder.id} updated successfully to "${folder.name}"\n`);
        } catch (error) {
            showError(error, "updating folder");
        }
    });

// Delete a folder
program
    .command('delete-folder')
    .description('Delete a folder and all its files')
    .option('-i, --id <id>', 'ID of the folder to delete')
    .option('-n, --name <name>', 'Name of the folder to delete')
    .action(async (opts) => {
        try {
            // Need either an ID or a name
            if (!opts.id && !opts.name) {
                console.error('\n❌ Please provide either a folder ID or name to delete\n');
                return;
            }

            let folder;

            // Find folder by ID if provided
            if (opts.id) {
            
                if (isNaN(parseInt(opts.id))) {
                    console.error('\n❌ That\'s not a valid folder ID. Try a number.\n');
                    return;
                }
                folder = await Folder.findByPk(opts.id);
            }
            // Otherwise find by name
            else {
                folder = await Folder.findOne({ where: { name: opts.name } });
            }

            // Make sure we found the folder
            if (!folder) {
                const searchTerm = opts.id ? `ID ${opts.id}` : `name "${opts.name}"`;
                console.error(`\n❌ Couldn't find a folder with ${searchTerm}.\n`);
                return;
            }

            // Ask for confirmation before deleting
            console.log(`\n⚠️ WARNING: You are about to delete folder "${folder.name}" and ALL its files. This cannot be undone!\n`);

            // Get all files in the folder to show what will be deleted
            const files = await File.findAll({ where: { folderId: folder.id } });

            if (files.length > 0) {
                console.log(`Files that will be deleted (${files.length}):`);
                files.forEach(file => {
                    console.log(`- ${file.title}`);
                });
                console.log('');
            }

            // Delete the folder (will cascade delete files due to relationship)
            await folder.destroy();

            console.log(`\n✅ Folder "${folder.name}" and all its files have been deleted.\n`);
        } catch (error) {
            showError(error, "deleting folder");
        }
    });

// Add a file to a folder (or default folder)
program
    .command('add-file')
    .description('Add a file to a folder')
    .option('-n, --title <title>', 'Title of the file')
    .option('-c, --content <content>', 'Content of the file')
    .option('-l, --label <label>', 'Label of the file (optional)')
    .option('-f, --folder <folderId>', 'ID of the folder (uses Default if not specified)')
    .action(async (opts) => {
        try {
            // Gotta have a title
            if (!opts.title) {
                console.error('\n❌ Hey! You need to give your file a title.\n');
                return;
            }

            if (opts.title.trim() === '') {
                console.error('\n❌ Come on, empty titles are not allowed!\n');
                return;
            }

            // Where should we put this file?
            let targetFolder;

            // No folder specified? Let's use the Default folder
            if (!opts.folder) {
                // Try to find our Default folder first
                targetFolder = await Folder.findOne({ where: { name: 'Default' } });

                // Create a Default folder if we don't have one yet
                if (!targetFolder) {
                    console.log('\n📁 Creating a Default folder for you...');
                    targetFolder = await Folder.create({
                        name: 'Default',
                        notes: 'Files without a specific folder go here'
                    });
                    console.log(`✅ Default folder created! (ID: ${targetFolder.id})\n`);
                } else {
                    console.log(`\n📁 Using the Default folder for this file (ID: ${targetFolder.id})\n`);
                }
            } else {
                // Make sure the ID is valid
                if (isNaN(parseInt(opts.folder))) {
                    console.error('\n❌ That\'s not a valid folder ID. Try a number.\n');
                    return;
                }

                // Find the folder they asked for
                targetFolder = await Folder.findByPk(opts.folder);

                if (!targetFolder) {
                    console.error(`\n❌ Hmm, couldn't find folder #${opts.folder}. Did you make a typo?\n`);
                    return;
                }
            }

            // Make sure we don't have duplicate titles in the same folder
            const dupe = await File.findOne({
                where: {
                    title: opts.title,
                    folderId: targetFolder.id
                }
            });

            if (dupe) {
                console.error(`\n❌ You already have a file called "${opts.title}" in this folder. Pick a different name.\n`);
                return;
            }

            // All checks passed - let's create it!
            const newFile = await File.create({
                title: opts.title,
                content: opts.content || '',
                label: opts.label || '',
                folderId: targetFolder.id
            });

            console.log(`\n✅ Added "${opts.title}" to folder "${targetFolder.name}"!\n`);
        } catch (error) {
            showError(error, "adding file");
        }
    });

// A simple command to delete a file
program
    .command('delete-file')
    .description('Delete a file')
    .option('-f, --file <fileId>', 'ID of the file to delete')
    .action(async (opts) => {
        try {
            // Validate input
            if (!opts.file) {
                console.error('\n❌ File ID is required. Please specify which file to delete\n');
                return;
            }

            if (isNaN(parseInt(opts.file))) {
                console.error('\n❌ Invalid file ID. Please provide a valid numeric ID\n');
                return;
            }

            // Check if file exists
            const file = await File.findByPk(opts.file);

            if (!file) {
                console.error(`\n❌ Oops, file with ID ${opts.file} not found. Please check the file ID\n`);
                return;
            }

            const fileTitle = file.title;

            // Delete the file
            await file.destroy();

            console.log(`\n✅ File "${fileTitle}" deleted successfully.\n`);
        } catch (error) {
            showError(error, "deleting file");
        }
    });

// Start up everything
setupDB().then(() => {
    // We're good to go!
    program.parse(process.argv);
}).catch(err => {
    console.error('Something went wrong starting up:', err);
    process.exit(1);
});
