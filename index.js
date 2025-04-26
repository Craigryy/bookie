//index.js

const { Command } = require("commander")
const Table = require('cli-table3');
const {Folder, File, sequelize} = require('./models');
const { Op } = require("sequelize");

const program = new Command();

// Initialize the database
async function initializeDatabase() {
    try {
        console.log('Syncing database...');
        await sequelize.sync();
        console.log('Database synced successfully');
    } catch (error) {
        console.error('Error syncing database:', error);
        process.exit(1);
    }
}

// Call this before parsing commands
initializeDatabase().then(() => {
    // Parse command line arguments after database is initialized
    program.parse(process.argv);
}).catch(error => {
    console.error('Failed to initialize application:', error);
    process.exit(1);
});

// A simple function for error handling
function handleError(error, context) {
    console.error(`\n❌ Error ${context}: ${error.message}`);
    if (error.name === 'SequelizeValidationError') {
        error.errors.forEach(err => {
            console.error(`  - ${err.message}`);
        });
    }
    console.error('');
}

// A simple command to display all commands
program
    .command('help')
    .description('Display all commands')
    .action(()=>{
        try {
            // Create a new table with styled borders
            const table = new Table({
                head: ['Command', 'Description'],
                style: {
                    head: ['cyan', 'bold'],
                    border: ['grey']
                }
            });

            // Add rows to the table
            table.push(
                ['create-folder', 'Create a new folder'],
                ['list-folders', 'List all folders and files'],
                ['update-folder', 'Update a folder'],
                ['add-file', 'Add a new file to a folder'],
                ['delete-file', 'Delete a file'],
                ['help', 'Display all commands'],
                ['exit', 'Exit the program']
            );

            console.log('\n📚 Bookie CLI - Available Commands:\n');
            console.log(table.toString());
            console.log('\n');
        } catch (error) {
            handleError(error, "displaying help");
        }
    });

// A simple command to create a new folder
program
    .command('create-folder')
    .description('Create a new folder')
    .option('-n, --name <name>', 'Name of the folder')
    .option('-d, --notes <notes>', 'Notes for the folder')
    .action(async (opts)=>{
        try {
            // Check if name is provided
            if (!opts.name) {
                console.error('\n❌ Oops, folder name cannot be empty, please input a folder name\n');
                return;
            }

            // Check if name is empty
            if (opts.name.trim() === '') {
                console.error('\n❌ Oops, folder name cannot be empty, please input a folder name\n');
                return;
            }

            // Check if notes are provided
            if (!opts.notes) {
                console.error('\n❌ Notes are required. Please provide notes for the folder\n');
                return;
            }

            // Check if folder with the same name already exists
            const existingFolder = await Folder.findOne({ where: { name: opts.name } });
            if (existingFolder) {
                console.error(`\n❌ Oops, a folder named "${opts.name}" already exists. Please use a different name.\n`);
                return;
            }
            // Sync the database
            await sequelize.sync();
            // Create the folder
            const folder = await Folder.create({
                name: opts.name,
                notes: opts.notes
            });

            console.log(`\n✅ Folder "${opts.name}" created successfully with ID: ${folder.id}\n`);
        } catch (error) {
            handleError(error, "creating folder");
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
            handleError(error, "listing folders");
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
            handleError(error, "updating folder");
        }
    });

program
    .command('delete-folder')
    .description('delete a folder by name or id')
    .option('-n, --name <name>', 'Name of the folder')
    .option('-i, --id <id>', 'ID of the folder')
    .action(async (opts)=>{
        try {
            // Check if name is provided
            const CheckName = await Folder.findOne({where:{name:opts.name}})
            if(!CheckName){
                console.error(`\n❌ Oops, folder with name ${opts.name} not found. Please check the folder name\n`);
                return;
            }

            // Check if id is provided
            const CheckId = await Folder.findByPk(opts.id)
            if(!CheckId){
                console.error(`\n❌ Oops, folder with id ${opts.id} not found. Please check the folder id\n`);
                return;
            }

            // Delete the folder
            await Folder.destroy({where:{id:opts.id || opts.name}})
            console.log(`\n✅ Folder with id ${opts.id || opts.name} deleted successfully\n`);

        } catch (error) {
            handleError(error, "deleting folder");
        }
    })
// A simple command to add a file to a folder
program
    .command('add-file')
    .description('Add a file to a folder')
    .option('-n, --title <title>', 'Title of the file')
    .option('-c, --content <content>', 'Content of the file')
    .option('-l, --label <label>', 'Label of the file')
    .option('-f, --folder <folderId>', 'ID of the folder to add the file to (optional, default folder will be used if not provided)')
    .action(async (opts) => {
        try {
            // Check if title is provided
            if (!opts.title) {
                console.error('\n❌ Oops, file title cannot be empty, please input a file title\n');
                return;
            }

            // Check if title is empty
            if (opts.title.trim() === '') {
                console.error('\n❌ Oops, file title cannot be empty, please input a file title\n');
                return;
            }

            // Create a folder variable/object 
            let folder;

            // If folder ID is not provided, use or create a default folder
            if (!opts.folder) {
                // Look for a default folder named "Default"
                folder = await Folder.findOne({ where: { name: 'Default' } });

                // If default folder doesn't exist, create it
                if (!folder) {
                    console.log('\n📁 Creating default folder for your files...');
                    folder = await Folder.create({
                        name: 'Default',
                        notes: 'Default folder for files with no specified folder'
                    });
                    console.log(`✅ Default folder created with ID: ${folder.id}\n`);
                } else {
                    console.log(`\n📁 Using default folder (ID: ${folder.id}) for this file\n`);
                }
            } else {
                // If folder ID is provided but invalid
                if (isNaN(parseInt(opts.folder))) {
                    console.error('\n❌ Invalid folder ID. Please provide a valid numeric ID\n');
                    return;
                }

                // Try to find the specified folder
                folder = await Folder.findByPk(opts.folder);

                // Check if folder exists
                if (!folder) {
                    console.error(`\n❌ Oops, folder with ID ${opts.folder} not found. Please check the folder ID\n`);
                    return;
                }
            }

            // Check if a file with the same title already exists in this folder
            const existingFile = await File.findOne({
                where: {
                    title: opts.title,
                    folderId: folder.id
                }
            });

            if (existingFile) {
                console.error(`\n❌ Oops, a file titled "${opts.title}" already exists in folder "${folder.name}". Please use a different title.\n`);
                return;
            }

            // Create the file
            const file = await File.create({
                title: opts.title,
                content: opts.content || '',
                label: opts.label || '',
                folderId: folder.id
            });

            console.log(`\n✅ File "${opts.title}" added to folder "${folder.name}" successfully.\n`);
        } catch (error) {
            handleError(error, "adding file");
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
            handleError(error, "deleting file");
        }
    });
