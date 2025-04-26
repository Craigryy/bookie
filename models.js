//models.js
const {Sequelize, DataTypes, Model} = require('sequelize');

// Change to file-based database for persistence between commands
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite'
});

class Folder extends Model {}

//define the folder model
Folder.init({
    id:{
        type:DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name:{
        type:DataTypes.STRING(200) ,
         allowNull: false
    },
    notes:{
        type:DataTypes.STRING(200),
        allowNull: true
    }
},
    {
        sequelize,
        modelName:'Folder'
    }
);

class File extends Model {}

//define the file model
File.init({
    id:{
        type:DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    title:{
        type:DataTypes.STRING(200),
        allowNull: false
    },
    content:{
        type:DataTypes.STRING(200),
        allowNull: true
    },
    label:{
        type:DataTypes.STRING(200),
        allowNull: true
    },
    folderId:{
        type:DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Folders',
            key: 'id'
        }
    }
},{
    //define the table name
    sequelize,
    modelName:'File'
});

//define the relationship between the folder and the file model,one to many relationship
Folder.hasMany(File,{
    foreignKey:'folderId',
    as:'files'
});
File.belongsTo(Folder,{
    foreignKey:'folderId',
    as:'folder'
});

module.exports = {Folder, File, sequelize};
