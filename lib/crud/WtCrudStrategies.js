/**
 * @module
 * @name WtCrudStrategies
 * @author Nicolò Zanardi
 * @description this handler works as a context for the transaction strategy
 *
 */
/*jshint node: true */
/*jshint esnext: true */
"use strict";

const PG = 'pg';
let BluebirdPromise = require('bluebird');
let FileSystemManager = require('xtens-fs').FileSystemManager;
let _ = require("lodash");

/**
 * @private
 * @description evaluate whether the metadata field has a measure unit. Only numeric values are allowed a unit.
 * @return {boolean} - true if the metadata field has unit
 */
function isUnitAllowed(field, fieldInstance) {
    // if its not numeric return false
    if (field.field_type !== 'Integer' && field.field_type !== 'Float') return false;
    if (!field.has_unit) return false;
    if (field.unit || _.isArray(field.units)) return true;
    return false;
}

/**
 * @class
 * @private
 * @description Invalid Format error
 */
class InvalidFormatError extends Error {

    constructor(message) {
        super();
        this.name = "InvalidFormatError";
        this.message = (message || "");
    }

}

class NotSupportedError extends Error {

    constructor() {
        super();
        this.name = "NotSupportedError";
        this.message = ("Method not yet supported.");
    }

}

/**
 * @class
 * @private
 * @description Transaction error
 */
class TransactionError extends Error {

    constructor(message) {
        super();
        this.name = "TransactionError";
        this.message = (message || "");
    }

}

/**
 *  @method
 *  @description from camelCase to under_score
 */
String.prototype.toUnderscore = function(){
    return this.replace(/([A-Z])/g, function($1){return "_"+$1.toLowerCase();});
};

/**
 * @class
 * @name WtCrudStrategy
 * @description abstract class for crud strategy
 */
class WtCrudStrategy {

    /**
     * @constructor
     * @param{Object} dbConnection
     * @param{Object} fsConnection
     */
    constructor(fsConnection) {
        console.log("WtCrudStrategy - FS Connection: ");
        console.log(fsConnection);
        if (!fsConnection) {
            throw new Error("You must specify a valid database connection (according to sails.js connection format)");
        }
        this.fileSystemManager = BluebirdPromise.promisifyAll(new FileSystemManager(fsConnection));
    }

    get fileSystemManager() {
        return this._fileSystemManager;
    }

    set fileSystemManager(fileSystemManager) {
        if (fileSystemManager) {
            this._fileSystemManager = fileSystemManager;
        }
    }

}

class WtPromiseCrudStrategy extends WtCrudStrategy {


    /**
     * @constructor
     * @param{Object} dbConnection
     * @param{Object} fsConnection
     */
    constructor(fsConnection) {
        super(fsConnection);
    }

    queryStream(statement, parameters, next) {
        let queryObj = {statement: statement, parameters: parameters};
        return next(global.sails.models.data.stream(queryObj), null);
    }
}

class WtKnexCrudStrategy extends WtCrudStrategy {

    /**
     * @constructor
     * @param{Object} fsConnection
     */
    constructor(fsConnection) {
        super(fsConnection);
    }

    /**
     * @method
     * @name createDataType
     * @description transactional DataType creation
     */
    createDataType(dataType) {

        let idDataType;

        return global.sails.models.datatype.create({
            name: dataType.name,
            model: dataType.model,
            project: dataType.project,
            super_type: dataType.superType,
            created_at: new Date(),
            updated_at: new Date()
        })

            //  .then(function(res) {
            //      idDataType = res.id;
            //      return BluebirdPromise.map(dataType.parents || [], function(idParent) {
            //          // NOTE: for some reason the column nomenclature is inverted here (must be preserved for Sails associations to work)
            //          return knex.returning('id').insert({
            //              'datatype_parents': idDataType,
            //              'datatype_children': idParent
            //          }).into('datatype_children__datatype_parents').transacting(trx);
            //      });
            //  })

         .then(function(res) {
             console.log("Created new DataType : " + res.name);
             return res;
         })

         .catch(function(error) {
             throw new TransactionError(error.message);
         });

    }

    /**
     * @method
     * @name updateDataType
     * @description transactional DataType creation
     *
     */
    updateDataType(dataType) {

        return global.sails.models.datatype.update({id : dataType.id },{
            name: dataType.name,
            model: dataType.model,
            project: dataType.project,
            super_type: dataType.superType,
            parents: dataType.parents,
            created_at: new Date(),
            updated_at: new Date()
        })

        .then(function(res) {
            console.log("Successfully updated DataType : "+ res.name);
            return res[0];
        })

        .catch(function(error) {
            throw new TransactionError(error.message);
        });

    }

    /**
     * @method
     * @name deleteDataType
     * @description transactional dataType delete
     * @param{integer} id - dataType ID
     */
    deleteDataType(id) {

        return global.sails.models.datatype.destroy({id : id })
        .then(function(deleted) {
            return deleted && deleted.length;
        })
        .catch(function(error) {
            throw new TransactionError(error.message);
        });
    }

    /**
     * @method
     * @name findData
     * @param{Object} criteria, may contain the following parameters:
     *                  - idOperator [integer]: the ID of the operator doing the current request
     *                  - model [string]: the MODEL of the dataTypes
     *                  - project [integer]: the ID of the working project
     *                  - parentDataType [integer]: the ID of the parent dataType
     *                  - idDataTypes [Array<integer>/String]: an array of the IDs of the allowed dataTypes
     *                  - privilegeLevel [enum]: can be one of {view_overview, view_details, download, edit} (ordered list)
     */
    findData(criteria) {

        let query = {};
        let model = criteria.model;
        delete criteria.model;
        delete criteria.privilegeLevel;
        delete criteria.idOperator;

        switch (model) {
            case "Data":
                query = global.sails.models.data.find(criteria);
                break;

            case "Subject":

                console.log(criteria);
                query = global.sails.models.subject.find(criteria);
                break;

            case "Sample":
                query = global.sails.models.sample.find(criteria);
                break;

            default:
                query = global.sails.models.data.find(criteria);

        }


        return query.then(function(results) {
            return results;
        });

    }


    /**
     * @method
     * @name countData
     * @param{Object} criteria, may contain the following parameters:
     *                  - idOperator [integer]: the ID of the operator doing the current request
     *                  - model [string]: the MODEL of the dataTypes
     *                  - project [integer]: the ID of the working project
     *                  - parentDataType [integer]: the ID of the parent dataType
     *                  - idDataTypes [Array<integer>/String]: an array of the IDs of the allowed dataTypes
     *                  - privilegeLevel [enum]: can be one of {view_overview, view_details, download, edit} (ordered list)
     */
    countData(criteria) {
        let query = {};
        let model = criteria.model;
        delete criteria.model;
        delete criteria.privilegeLevel;
        delete criteria.idOperator;
        switch (model) {
            case "Data":
                query = global.sails.models.data.count(criteria);
                break;

            case "Subject":
                query = global.sails.models.subject.count(criteria);
                break;

            case "Sample":
                query = global.sails.models.sample.count(criteria);
                break;

            default:
                query = global.sails.models.data.count(criteria);

        }


        return query.then(function(results) {
            return results;
        });
    }

    /**
     * @method
     * @name getDataTypesByRolePrivileges
     * @param{Object} criteria, may contain the following parameters:
     *                  - idOperator [integer]: the ID of the operator doing the current request
     *                  - model [string]: the MODEL of the dataTypes
     *                  - parentDataType [integer]: the ID of the parent dataType
     *                  - idDataTypes [Array<integer>/String]: an array of the IDs of the allowed dataTypes
     */
    getDataTypesByRolePrivileges(criteria) {


        return global.sails.models.datatype.find().then(function(results) {
          //console.log('Datatype: ' + JSON.stringify(results));
            return results;
        })
        .catch(function(error) {
            throw new TransactionError(error.message);
        });
    }


    /**
     * @method
     * @name handleFiles
     * @description store files within a database transaction
     * @param{Array} files - the array of dataFiles, containing at lest a uri or name property
     * @param{integer} idData - the identifier of the data instance to create/update
     * @param{string} dataTypeName - the name of the dataType
     * @param{Object} trx - the current transaction object
     * @param{string} tableName - the table where the entity associated to the files is stored ('subject', 'sample' or 'data');
     * @return{BluebirdPromise} a bluebird promise object
     */
    handleFiles(files, idData, dataTypeName, tableName) {


        let fileSystemManager = this.fileSystemManager;
        tableName = tableName || 'data';

        return BluebirdPromise.map(files, function(file) {
            console.log("WaterlineStrategy.createData - handling file: " + file.uri || file.name);
            return fileSystemManager.storeFileAsync(file, idData, dataTypeName);
        })

        // insert the DataFile instances on the database
        .then(function(results) {
            if (results.length) {   // if there are files store their URIs on the database
                console.log("WaterlineStrategy.createData - inserting files..");
                return _.each(files, function(file) {
                    global.sails.models.datafile.create({
                        uri: file.uri,
                        samples: file.samples,
                        details: file.details,
                        data: file.data,
                        created_at: new Date(),
                        updated_at: new Date()
                    });
                });
            }

            else {  // else return an empty array
                return [];
            }
        })

        // create the associations between the Data instance and the DataFile instances
        .then(function(idFiles) {
            console.log(idFiles);
            console.log("WaterlineStrategy.createData - creating associations...");

            if (tableName == 'data'){
                return BluebirdPromise.map(idFiles, function(idFile) {

                    return global.sails.models.data.findOne({id: idData}).populate('files')
                    .then(function(err,res){

                        res.files.add(idFile);
                        res.save(function(err){console.log(err);});

                    });
                });
            }
            else if(tableName == 'sample'){
                return BluebirdPromise.map(idFiles, function(idFile) {

                    return global.sails.models.sample.findOne({id: idData}).populate('files')
                    .then(function(err,res){

                        res.files.add(idFile);
                        res.save(function(err){console.log(err);});

                    });
                });
            }
        })
        .catch(function(error) {
            console.log("WaterlineStrategy.handleFiles - error caught");
            console.log(error);
            throw new TransactionError(error.message);
        });

    }

    /**
     * @method
     * @name createData
     * @description transactional Data creation with File Upload to the File System (e.g iRODS)
     * @param {Object} data - an xtens-app Data entity
     * @param {string} dataTypeName - the name of the DataType (used only for file storage)
     * @return idData the ID of the newly created Data
     */
    createData(data, dataTypeName) {
        let that=this;
        let files = data.files ? _.cloneDeep(data.files) : [];
        delete data.files;
        let idData = null;
        let result = null;
        // transaction-safe data creation
        return global.sails.models.data.create({
            type: data.type,
            tags: JSON.stringify(data.tags),
            notes: data.notes,
            metadata: data.metadata,
            owner: data.owner,
            acquisition_date: data.date,
            parent_subject: data.parentSubject,
            parent_sample: data.parentSample,
            parent_data: data.parentData,
            created_at: new Date(),
            updated_at: new Date()

        })
            // store files on the FileSystem of choice (e.g. iRODS) in their final collection
            .then(function(res) {
                result=res;
                idData = res.id;
                console.log("WaterlineStrategy.createData - data instance created with ID: " + idData);
                return that.handleFiles(files, idData, dataTypeName);

            }) // Knex supports implicit commit/rollback
        .then(function(inserts) {
            console.log("WaterlineStrategy.createData: transaction committed for new Data: " + idData);
            return result;
        })
        .catch(function(error) {
            console.log("WaterlineStrategy.createData - error caught");
            console.log(error);
            throw new TransactionError(error.message);
        });

    }


    /**
     * @method
     * @name updateData
     * @description transactional Data update. Files should not be changed after creation (at least in the current implementation are not)
     */

    updateData(data, dataTypeName) {

        let that = this;
        let updatedData = null;
        let partitionedFiles = _.partition(data.files, file => {
            return !file.id;
        });
        let existingFiles = partitionedFiles[1], notExistingFiles = partitionedFiles[0];

        console.log("WaterlineStrategy.updateData - new files to insert...");
        console.log(data);
        delete data.files;

    // transaction-safe Data update


        return  global.sails.models.data.update({id: data.id},
          // NOTE: should I also update owner, parent_subject, parent_sample and/or parent_data? Should it be proper/safe?
          {tags: JSON.stringify(data.tags),
          notes: data.notes,
          acquisition_date: data.date,
          metadata: data.metadata,
          updated_at: new Date()
      })
        .then(function(updata) {
            updatedData=updata;
            console.log("WaterlineStrategy.updateData - data instance updated for ID: " + JSON.stringify(updatedData));
            return that.handleFiles(notExistingFiles, updatedData.id, dataTypeName);
        })
        .then(function() {
            notExistingFiles = _.map(notExistingFiles, file => {
                return _.mapKeys(file, (value, key) => { return _.camelCase(key); });
            });
            data.files = existingFiles.concat(notExistingFiles);
        })
    .then(function() {
        console.log("WaterlineStrategy.updateData: transaction committed updating Data with ID: " + updatedData.id);
        return updatedData;
    })
    .catch(function(error){
        console.log("WaterlineStrategy.updateData - error caught");
        console.log(error);
        throw new TransactionError(error.message);
    });
    }

    /**
     * @method
     * @name deleteData
     * @param{id}
     */
    deleteData(id) {
        return global.sails.models.data.destroy({id : id })
        .then(function(deleted) {
            return deleted && deleted.length;
        })
        .catch(function(error) {
            console.log(error);
            throw new TransactionError(error.message);
        });
    }

    /**
     * @method
     * @name createSample
     * @description transactional Sample creation with File upload to the File System (e.g. iRODS)
     */
    createSample(sample, sampleTypeName) {
        let that = this;
        let fileSystemManager = this.fileSystemManager;
        let files = sample.files ? _.cloneDeep(sample.files) : [];
        delete sample.files;
        let Sample,idSample = null;

        // transaction-safe sample creation

        console.log ("WaterlineStrategy.createSample - creating new sample instance...");

            // store the new Sample entity
        let sampleCode = sample.biobankCode || '080001';
        return global.sails.models.sample.create({
            biobankCode: sampleCode,
            type: sample.type,
            biobank: sample.biobank,
            parent_subject: sample.donor,
            owner: sample.owner,
            parent_sample: sample.parentSample,
            metadata: sample.metadata,
            created_at: new Date(),
            updated_at: new Date()
        })


            // store files on the FileSystem of choice (e.g. iRODS) in their final collection
            .then(function(res) {
                Sample=res;
                idSample = res.id;
                console.log("WaterlineStrategy.createData - data instance created with ID: " + idSample);
                return that.handleFiles(files, idSample, sampleTypeName,'sample');

            })

         // Waterline supports implicit commit/rollback
        .then(function(inserts) {
            console.log("WaterlineStrategy.createSample: transaction committed for new Sample: " + idSample);
            return Sample;
        })
        .catch(function(error) {
            console.log("WaterlineStrategy.createSample - error caught");
            console.log(error);
            throw new TransactionError(error.message);
        });

    }

    getNextBiobankCode(sample, project, next) {
        console.log("WaterlineStrategy.getNextBiobankCode");
        if (!project) {
          return BluebirdPromise.resolve(null);
        }
       if (sample.biobankCode) {
         return BluebirdPromise.resolve(sample.biobankCode);
       }
       return global.sails.models.sample.findOne({id: 2}).then(function(sample){
           return BluebirdPromise.resolve(_.parseInt(sample.biobankCode) + 1, null);
       });
   }

   getNextSubjectCode(subject, next) {
       console.log("WaterlineStrategy.getNextSubjectCode");
       if (!project) {
         return BluebirdPromise.resolve(null);
       }
      if (subject.code) {
        return BluebirdPromise.resolve(subject.code);
      }
      return global.sails.models.subject.findOne({id: 2}).then(function(subject){
          let splitted = subject.code.split(/(\d+)/).filter(Boolean);
          let prefix = splitted.slice(0, -1).join('');
          let nextId = _.parseInt(splitted.slice(-1)) ? (_.parseInt(splitted.slice(-1))+1) : 1;
          subjCode = prefix ? prefix : "PRFX-";
          subjCode = subjCode + nextId;
          return BluebirdPromise.resolve(subjCode, null);
      });
  }

    /**
     * @method
     * @name updateSample
     * @description transaction-safe Sample update
     * @param {Object} sample - a Sample entity
     * @return idSample the ID of the updated Sample
     */
    updateSample(sample) {

        return global.sails.models.sample.update({ id: sample.id },{
            biobank: sample.biobank,
            parent_subject: sample.donor,
            metadata: sample.metadata,
            updated_at: new Date()
        })

        .then(function(res) {
            let idSample =  res.id;
            console.log("WaterlineStrategy.updateSample: transaction committed updating Data with ID: " + idSample);
            return res;
        })
        .catch(function(error){
            console.log("WaterlineStrategy.updateSample - error caught");
            console.log(error);
            throw new TransactionError(error.message);
        });


    }

    /**
     * @method
     * @name deleteSample
     * @param{id} - sample ID
     */
    deleteSample(id) {
        return global.sails.models.sample.destroy({id : id })
        .then(function(deleted) {
            return deleted && deleted.length;
        })
        .catch(function(error) {
            throw new TransactionError(error.message);
        });
    }

    /**
     *  @method
     *  @name createSubject
     *  @description  transactional Subject creation
     */
    createSubject(subject, subjectTypeName) {
        let idProjects = _.cloneDeep(subject.projects) || [];
        delete subject.projects;
        let idSubject = null;


        console.log ("WaterlineStrategy.createSubject - creating new subject instance...");

            // create the new PersonalDetails instance (if personalDetails are present)
        return BluebirdPromise.try(function() {
            if (!subject.personalInfo) {
                return;
            }
            else {
                return global.sails.models.personaldetails.create({
                    givenName: subject.personalInfo.givenName,
                    surname: subject.personalInfo.surname,
                    birthDate: subject.personalInfo.birthDate,
                    created_at: new Date(),
                    updated_at: new Date()
                });
            }
        })


            // create the new Subject entity
            .then(function(result) {

                subject.personalInfo = result && result.id;
                // let lastId = result.rows && result.rows[0] && _.parseInt(result.rows[0].last_value);
                // let subjCode = 'SUBJ-' + (lastId+1);
                // console.log("WaterlineStrategy.createSubject - subject code: " + subjCode);
                return global.sails.models.subject.create({
                    code: subject.code,// || subjCode, // if a code is provided by the user use that
                    sex: subject.sex || 'N.D.',
                    type: subject.type,
                    tags: JSON.stringify(subject.tags),
                    owner: subject.owner,
                    notes: subject.notes,
                    metadata: subject.metadata,
                    personalInfo: subject.personalInfo,
                    created_at: new Date(),
                    updated_at: new Date(),
                    projects: idProjects
                });
            })

            // create all the Subject-Project associations
            // .then(function(res) {
            //     idSubject = res.id;
            //     console.log("WaterlineStrategy.createSubject - creating associations with projects...");
            //     return BluebirdPromise.map(idProjects, function(idProject) {
            //         return knex.insert({'project_subjects': idProject, 'subject_projects': idSubject})
            //         .into('project_subjects__subject_projects').transacting(trx);
            //     });
            // })

         // Waterline supports implicit commit/rollback
        .then(function(res) {
            console.log("WaterlineStrategy.createSubject: transaction committed for new Subject: " + res.id);
            return res;
        })
        .catch(function(error) {
            console.log("WaterlineStrategy.createSample - error caught");
            console.log(error);
            throw new TransactionError(error.message);
        });

    }

    /**
     * @method
     * @name updateSubject
     * @description transaction-safe Subject update
     * @param {Object} subject - the Subject entity to be updated
     * @return idSubject
     */
    updateSubject(subject) {

        let idSubject=subject.id;
        let idProjects = _.cloneDeep(subject.projects) || [];
        delete subject.projects;


            // Update or create personal information
        return BluebirdPromise.try(function() {
            console.log("WaterlineStrategy.updateSubject - trying to create/edit PersonalInfo: " + subject.personalInfo);

                // if no personalInfo is provided just skip this step (no creation/update)
            if (!_.isObject(subject.personalInfo)) {
                return;
            }

                // you have to create a new personal_details entity (i.e. row)
            else if(!subject.personalInfo.id) {

                return global.sails.models.personaldetails.create({
                    givenName: subject.personalInfo.givenName,
                    surname: subject.personalInfo.surname,
                    birthDate: subject.personalInfo.birthDate,
                    created_at: new Date(),
                    updated_at: new Date()
                });
            }

                // otherwise update personal_details
                else {
                return global.sails.models.personaldetails.update({ id : subject.personalInfo.id},{
                    surname: subject.personalInfo.surname,
                    givenName: subject.personalInfo.givenName,
                    birthDate: subject.personalInfo.birthDate
                });
            }

        })

            // update Subject entity
            .then(function(id) {
                console.log("WaterlineStrategy.updateSubject - updating Subject..." + JSON.stringify(id[0]));

                if(id & id[0]) {
                    subject.personalInfo = id[0];
                }
                return global.sails.models.subject.update({ id : idSubject},{
                    tags: JSON.stringify(subject.tags),
                    notes: subject.notes,
                    metadata: subject.metadata,
                    updated_at: new Date(),
                    projects: idProjects
                });

            })

            // // update Projects if present
            // // first delete all existing Projects
            // .then(function(res) {
            //     console.log("WaterlineStrategy.updateSubject - dissociating projects for Subject ID: " + res.id);
            //     idSubject = res.id;
            //     return knex('project_subjects__subject_projects').where('subject_projects','=',idSubject).del().transacting(trx);
            // })
            //
            // // then insert all listed Projects
            // .then(function() {
            //     console.log("WaterlineStrategy.updateSubject - associating projects for Subject ID: " + idSubject);
            //     return BluebirdPromise.map(idProjects, function(idProject) {
            //         return knex.insert({'project_subjects': idProject, 'subject_projects': idSubject})
            //         .into('project_subjects__subject_projects').transacting(trx);
            //     });
            // })


        .then(function(res) {
            console.log('WaterlineStrategy.updateSubject - transaction commited for updating subject with ID:' + idSubject);
            return res;
        })
        .catch(function(error) {
            console.log("WaterlineStrategy.createSample - error caught");
            console.log(error);
            throw new TransactionError(error.message);
        });

    }

    /**
     * @method
     * @name deleteData
     * @param{id}
     */
    deleteSubject(id) {
        // TODO should personalDetails be deleted as well??
        return global.sails.models.subject.destroy({ id : id})
        .then(function(deleted) {
            return deleted && deleted.length;
        })
        .catch(function(error) {
            throw new TransactionError(error.message);
        });
    }


    /**
     *  @method
     *  @name putMetadataFieldsIntoEAV
     *  @description extract the Metadata Fields from the JSON schema and stores each one in a dedicated
     *              ATTRIBUTE table, for use in an EAV catalogue
     *  @param {integer} idDataType - the identifier of the DataType (i.e. ENTITY)
     *  @param {Array} fields - the array containing all the MetadataFields to be inserted (or updated?)
     *  @param {boolean} useFormattedNames - if true use the formatted name
     *  TODO check the use of formatted names
     *
     */
    putMetadataFieldsIntoEAV(idDataType, fields, useFormattedNames) {

        return new NotSupportedError();
        // let knex = this.knex;
        //
        // return knex.transaction(function(trx) {
        //
        //     // for each metadata field
        //     return BluebirdPromise.map(fields, function(field) {
        //
        //         // insert the new metadata field
        //         return knex('eav_attribute').where({
        //             'data_type': idDataType,
        //             'name': field.name
        //         }).transacting(trx)
        //
        //         .then(function(found) {
        //             console.log("WaterlineStrategy.putMetadataFieldsIntoEAV - found for field " + field.name + ": "  + found);
        //             if (_.isEmpty(found)) {
        //                 console.log("WaterlineStrategy.putMetadataFieldsIntoEAV - inserting field " + field.name);
        //                 return knex.returning('id').insert({
        //                     'data_type': idDataType,
        //                     'name': useFormattedNames ? field.formattedName : field.name, // notice: this must be tested - by Massi
        //                     'field_type': field.fieldType,
        //                     'has_unit': field.hasUnit,
        //                     'created_at': new Date(),
        //                     'updated_at': new Date()
        //                 }).into('eav_attribute').transacting(trx);
        //             }
        //         });
        //
        //     });
        //
        // })
        //
        // .then(function(insertedIds) {
        //     console.log('WaterlineStrategy.putMetadataFieldsIntoEAV - transaction commited for DataType:' + idDataType);
        //     return _.flatten(insertedIds);
        // })
        //
        // .catch(function(error) {
        //     console.log("WaterlineStrategy.putMetadataFieldsIntoEAV - error caught");
        //     console.log(error);
        //     throw new TransactionError("Transaction could not be completed. Some error occurred");
        // });
    }


    /**
     * @method
     * @name putMetadataValuesIntoEAV
     * @description extract the metadata values from the "metadata" column of the "data" ("subject" or "sample") entity,
     * and store it in the appropriate EAV Value(s) table. Five value tables are provided, one for each fundamental data type (text, integer, float,
     * date and boolean)
     * @param {Object} data -  the Data (Subject, Sample or Generic) that must extracted and loadad in the EAV catalogue
     *
     */
    putMetadataValuesIntoEAV(data, eavValueTableMap) {
        return new NotSupportedError();

        // console.log("WaterlineStrategy.putMetadataValuesIntoEAV - eavValueTableMap: " + eavValueTableMap);
        // let knex = this.knex;
        // return knex.transaction(function(trx) {
        //
        //     return knex('data_type').where({id: data.type}).first('model').transacting(trx)
        //
        //     .then(function(row) {
        //
        //         // identify the table (e.g. data, subject, sample...)
        //         let entityTable = row.model.toLowerCase().toUnderscore();
        //         console.log("WaterlineStrategy.putMetadataValuesIntoEAV - entity table is: " + entityTable);
        //
        //         // store each metadata value in the appropriate EAV catalogue
        //         return BluebirdPromise.map(Object.keys(data.metadata), function(metadataField) {
        //
        //             console.log("WaterlineStrategy.putMetadataValuesIntoEAV - trying to retrieve the metadataField: " + metadataField);
        //             // find the attribute
        //             return knex('eav_attribute').where({
        //                 'data_type': data.type,
        //                 'name': metadataField
        //             }).transacting(trx)
        //
        //             //
        //             .then(function(eavAttribute) {
        //                 if (eavAttribute.length !== 1) {
        //                     throw new Error("none or more than one attribute was restrieved!!");
        //                 }
        //
        //                 eavAttribute = eavAttribute[0];
        //                 let eavValueTable;
        //                 console.log("WaterlineStrategy.putMetadataValuesIntoEAV - eavAttribute: " + eavAttribute);
        //                 // if the metadata has a single field value, insert it!
        //                 if (data.metadata[metadataField].value) {
        //                     console.log("WaterlineStrategy.putMetadataValuesIntoEAV - field " + metadataField + " is a single attribute");
        //                     let eavValue = {
        //                         // 'entity_table': table,
        //                         'entity': data.id,
        //                         'attribute': eavAttribute.id,
        //                         'value': data.metadata[metadataField].value,
        //                         'created_at': new Date(),
        //                         'updated_at': new Date()
        //                     };
        //
        //                     if (isUnitAllowed(eavAttribute, data.metadata[metadataField])) {
        //                         console.log ("WaterlineStrategy.putMetadataValuesIntoEAV - unit allowed for field: " + metadataField);
        //                         eavValue.unit = data.metadata[metadataField].unit;
        //                     }
        //                     eavValueTable = eavValueTableMap[eavAttribute.field_type] + '_' + entityTable;
        //                     console.log("WaterlineStrategy.putMetadataValuesIntoEAV - eavAttribute: " + eavAttribute);
        //                     console.log("WaterlineStrategy.putMetadataValuesIntoEAV - inserting new value into table " + eavValueTable);
        //                     return knex.returning('id').insert(eavValue).into(eavValueTable).transacting(trx);
        //                 }
        //
        //                 // otherwise it is a loop!!
        //                 else if (_.isArray(data.metadata[metadataField].values)) {
        //                     console.log("WaterlineStrategy.putMetadataValuesIntoEAV - field " + metadataField + " is a loop");
        //                     let unitAllowed = isUnitAllowed(data.metadata[metadataField], eavAttribute);
        //                     let eavValues = data.metadata[metadataField].values.map(function(value, index) {
        //                         let instance = {
        //                             'entity': data.id,
        //                             'attribute': eavAttribute.id,
        //                             'value': value,
        //                             'created_at': new Date(),
        //                             'updated_at': new Date()
        //                         };
        //                         if (unitAllowed) {
        //                             console.log ("WaterlineStrategy.putMetadataValuesIntoEAV - unit allowed for field: " + metadataField);
        //                             instance.unit = data.metadata[metadataField].units[index];
        //                         }
        //                         return instance;
        //                     });
        //                     eavValueTable = eavValueTableMap[eavAttribute.field_type] + '_' + entityTable;
        //                     console.log("WaterlineStrategy.putMetadataValuesIntoEAV - inserting new value into table " + eavValueTable);
        //                     return knex.returning('id').insert(eavValues).into(eavValueTable).transacting(trx);
        //                 }
        //
        //                 // something is wrong, throw new error
        //                 else {
        //                     console.log("WaterlineStrategy.putMetadataValuesIntoEAV - metadata field" + metadataField +
        //                                 "missing or it does not possess a valid value");
        //                 }
        //             });
        //
        //         })
        //
        //         .then(function(ids) {
        //
        //             console.log("WaterlineStrategy.putMetadataValuesIntoEAV - inserted successfully new metadata value: IDS " + ids);
        //             return ids;
        //         });
        //     })
        //
        //     .then(function(insertedIds) {
        //         // console.log('WaterlineStrategy.putMetadataValuesIntoEAV - inserted values'+ insertedIds);
        //         return _.flatten(insertedIds);
        //     })
        //
        //     .catch(function(error) {
        //         console.log("WaterlineStrategy.putMetadataValuesIntoEAV - error caught");
        //         console.log(error);
        //         throw new TransactionError("Transaction could not be completed. Some error occurred");
        //     });
        //
        // });

    }

    /**
     * @method
     * @name query
     * @param{String} statement - the prepared/parametrized statement
     * @param{Array} params - the parameters array
     * @return{Promise} a promise with args an array with retrieved items
     */
    // query(statement, params) {
    //     // use Knex to perform raw query on PostgreSQL database
    //     return this.knex.raw(statement, params);
    // }

}
module.exports.WtCrudStrategy = WtCrudStrategy;
module.exports.WtKnexCrudStrategy = WtKnexCrudStrategy;
module.exports.WtPromiseCrudStrategy = WtPromiseCrudStrategy;
