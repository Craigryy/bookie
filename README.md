# Bookie CLI

A command-line application for organizing and managing folders and files with a simple, intuitive interface.

## Features

- Create and manage folders with notes
- Add files with title, content, and labels to folders
- List all folders and their associated files
- Update folder information
- Delete files
- Clean and colorful command-line interface

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Make the CLI globally accessible:
```bash
npm link
```
After linking, you can use `bookie` instead of `node bookie.js` for all commands.

## Usage

### Running the CLI
```bash
# Basic usage
node bookie.js <command>

# If globally linked
bookie <command>
```

### Help
Display all available commands:
```bash
node bookie.js help
```

### Create a Folder
```bash
node bookie.js create-folder -n "JavaScript" -d "JavaScript learning resources"
```

### List Folders
List all folders and their files:
```bash
node bookie.js list-folders
```

### Update a Folder
```bash
node bookie.js update-folder -i 1 -n "New Name" -d "Updated description"
```
- `-i`: Folder ID (required)
- `-n`: New folder name (optional)
- `-d`: New folder description (optional)

### Add a File to a Folder
```bash
node bookie.js add-file -n "My File" -c "File content" -l "Important" -f 1
```
- `-n`: File title (required)
- `-c`: File content (optional)
- `-l`: File label (optional)
- `-f`: Folder ID to add the file to (required)

### Delete a File
```bash
node bookie.js delete-file -f 1
```
- `-f`: File ID to delete (required)

## Project Structure

- `index.js`: Main CLI application logic
- `models.js`: Database models and schemas
- `bookie.js`: CLI entry point
- `database.sqlite`: SQLite database file (generated on first run)
