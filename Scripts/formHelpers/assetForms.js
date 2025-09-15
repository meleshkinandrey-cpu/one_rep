define(['jquery', 'knockout', 'formControl', 'usualForms'], function ($, ko, fc, ufh) {
    var module = {
        formHelper: function (isSpinnerActive) {
            var self = this;
            //
            self.ShowAssetLink = function (objectInfo, callbackFunc) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var firstButtons = {};
                firstButtons = {
                    "cancel": {
                        text: getTextResource('CancelButtonText'),
                        'class': 'GrayUIButton',
                        click: function () { ctrl.Close(); }
                    }
                };
                //
                var mod = null;
                //
                var afterClose = function () {
                    if (mod)
                        mod.dispose();
                };
                //
                var formCaption = objectInfo.Caption ? objectInfo.Caption : getTextResource('AssetLinkHeader');
                //
                var ctrl = undefined;
                var name = 'assetLinkForm';
                ctrl = new fc.control(name, name, formCaption, true, true, true, 800, 500, firstButtons, afterClose, 'data-bind="template: {name: \'AssetForms/AssetLink/MainForm\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                ctrl.ExtendSize(1100, 800);
                //
                require(['models/AssetForms/AssetLink/AssetLink'], function (vm) {
                    var mainRegionID = ctrl.GetRegionID();
                    var $region = $('#' + mainRegionID);
                    mod = new vm.ViewModel($region, objectInfo);
                    //
                    mod.SetCLearButtonsList = function () {
                        var buttons = {};
                        buttons = {
                            "cancel": {
                                text: getTextResource('CancelButtonText'),
                                'class': 'GrayUIButton',
                                click: function () { ctrl.Close(); }
                            }
                        };
                        //
                        ctrl.UpdateButtons(buttons);
                    };
                    mod.SetFilledButtonsList = function () {
                        var buttons = {};
                        buttons = {
                            "cancel": {
                                text: getTextResource('CancelButtonText'),
                                'class': 'GrayUIButton',
                                click: function () { ctrl.Close(); }
                            },
                            'clear': {
                                text: getTextResource('ClearSelection'),
                                'class': 'GrayUIButton',
                                click: function () { mod.ClearSelection(); }
                            },
                            'attach': {
                                text: getTextResource('Attach'),
                                click: function () {
                                    if (callbackFunc)
                                        callbackFunc(mod.GetFinalList());
                                    //
                                    ctrl.Close();
                                }
                            }
                        };
                        //
                        ctrl.UpdateButtons(buttons);
                    };
                    mod.SetClearSelectionButtonsList = function () {
                        var buttons = {};
                        buttons = {
                            "cancel": {
                                text: getTextResource('CancelButtonText'),
                                'class': 'GrayUIButton',
                                click: function () { ctrl.Close(); }
                            },
                            'clear': {
                                text: getTextResource('ClearSelection'),
                                'class': 'GrayUIButton',
                                click: function () { mod.ClearSelection(); }
                            }
                        };
                        //
                        ctrl.UpdateButtons(buttons);
                    };
                    //
                    $.when(ctrlD).done(function () {
                        ko.applyBindings(mod, document.getElementById(mainRegionID));
                        //
                        $.when(mod.$isLoaded).done(function () {
                            hideSpinner();
                        });
                        //
                        var oldSizeChanged = ctrl.SizeChanged;
                        ctrl.SizeChanged = function () {
                            oldSizeChanged();
                            mod.SizeChanged();
                        };
                    });
                });
            };
            //
            self.ShowAssetModelLink = function (activeRequestMode, hasLifeCycleOnly, callbackFunc, modelSearchMode, productCatalogueItemInfo, formCaption) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var mod = null;
                var ctrl = undefined;
                //
                var buttons = [];
                var bClose = {
                    text: getTextResource('Close'),
                    'class': 'GrayUIButton',
                    click: function () { ctrl.Close(); }
                };
                var bSelect = {
                    text: getTextResource('Add'),
                    click: function () {
                        if (callbackFunc)
                            callbackFunc(mod.getPackedSelectedObjectList());
                        //
                        ctrl.Close();
                    }
                };
                buttons.push(bClose);
                //
                var afterClose = function () {
                    if (mod)
                        mod.dispose();
                };
                //
                var name = 'assetModelLinkForm';
                var formName = formCaption ? formCaption : getTextResource('AssetModelLinkHeader');
                ctrl = new fc.control(name, name, formName, true, true, true, 800, 500, buttons, afterClose, 'data-bind="template: {name: \'AssetForms/AssetModelLink/MainForm\', afterRender: afterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                ctrl.ExtendSize(1100, 800);
                //
                require(['models/AssetForms/AssetModelLink/AssetModelLink'], function (vm) {
                    var mainRegionID = ctrl.GetRegionID();
                    var $region = $('#' + mainRegionID);
                    mod = new vm.ViewModel($region, activeRequestMode, hasLifeCycleOnly, modelSearchMode, productCatalogueItemInfo);
                    //
                    mod.isSelectButtonVisible.subscribe(function (newValue) {
                        if (newValue == false && buttons.length != 1) {
                            buttons = [bClose];
                            ctrl.UpdateButtons(buttons);
                        }
                        else if (newValue == true && buttons.length == 1) {
                            buttons = [bClose, bSelect];
                            ctrl.UpdateButtons(buttons);
                        }
                    });
                    //
                    $.when(ctrlD).done(function () {
                        ko.applyBindings(mod, document.getElementById(mainRegionID));
                        //
                        $.when(mod.isLoaded).done(function () {
                            hideSpinner();
                        });
                    });
                });
            };
            //
            self.ShowSoftwareLicenceModelLink = function (
                activeRequestMode,
                hasLifeCycleOnly,
                callbackFunc,
                modelSearchMode,
                productCatalogueItemInfo,
                formCaption) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var mod = null;
                var ctrl = undefined;
                //
                var buttons = [];
                var bClose = {
                    text: getTextResource('Close'),
                    'class': 'GrayUIButton',
                    click: function () { ctrl.Close(); }
                };
                var bSelect = {
                    text: getTextResource('Select'),
                    click: function () {
                        if (callbackFunc)
                            callbackFunc(mod.getPackedSelectedObjectList());
                        //
                        ctrl.Close();
                    }
                };
                buttons.push(bClose);
                //
                var afterClose = function () {
                    if (mod)
                        mod.dispose();
                };
                //
                var name = 'ModelLinkForm';
                var formName = formCaption ? formCaption : getTextResource('SoftwareModelLinkHeader');
                ctrl = new fc.control(name, name, formName, true, true, true, 1000, 760, buttons, afterClose, 'data-bind="template: {name: \'SoftwareLicence/SoftwareLicenceModelLink/MainForm\', afterRender: afterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                ctrl.ExtendSize(1000, 760);
                //
                require(['models/AssetForms/SoftwareLicenceModelLink/SoftwareLicenceModelLink'], function (vm) {
                    var mainRegionID = ctrl.GetRegionID();
                    var $region = $('#' + mainRegionID);
                    mod = new vm.ViewModel($region, activeRequestMode, hasLifeCycleOnly, modelSearchMode, productCatalogueItemInfo);
                    //
                    mod.isSelectButtonVisible.subscribe(function (newValue) {
                        if (newValue == false && buttons.length != 1) {
                            buttons = [bClose];
                            ctrl.UpdateButtons(buttons);
                        }
                        else if (newValue == true && buttons.length == 1) {
                            buttons = [bClose, bSelect];
                            ctrl.UpdateButtons(buttons);
                        }
                    });
                    //
                    $.when(ctrlD).done(function () {
                        ko.applyBindings(mod, document.getElementById(mainRegionID));
                        //
                        $.when(mod.isLoaded).done(function () {
                            hideSpinner();
                        });
                    });
                });
            };
            //
            self.ShowAssetIdentifierSetForm = function (generateInvNum, generateCode, paramsD, callbackFunc) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {};
                var ctrl = undefined;
                var mod = undefined;
                buttons[getTextResource('CancelButtonText')] = function () {
                    paramsD.resolve(null);
                    ctrl.Close();
                };
                buttons[getTextResource('ButtonSave')] = function () {
                    var params = mod.GetParams();
                    paramsD.resolve(params);
                    ctrl.Close();
                };
                //
                ctrl = new fc.control('AssetIdentifierSetForm', 'AssetIdentifierSetForm', getTextResource('AssetIdentifierSet'), true, false, false, 250, 250, /*450, 450,*/ buttons, null, 'data-bind="template: {name: \'AssetForms/AssetOperations/AssetIdentifierSet\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                //
                require(['models/AssetForms/AssetOperations/AssetIdentifierSet'], function (vm) {
                    var mainRegionID = ctrl.GetRegionID();
                    var $region = $('#' + mainRegionID);
                    //
                    mod = new vm.ViewModel(generateInvNum, generateCode, callbackFunc, $region);
                    mod.Load();
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD, mod.LoadD).done(function () {
                        hideSpinner();
                    });
                });
            };
            //
            //вызов формы сетевого оборудования, оконечного оборудования, адаптера или периферийного устройства
            self.ShowAssetForm = function (id, classID) {
                require(['ui_forms/Asset/frmAsset'], function (jsModule) {
                    jsModule.ShowDialog(id, classID, isSpinnerActive);
                });
            };
            //
            //вызов формы добавления оборудования
            self.ShowAssetRegistrationForm = function (classID, parentObject) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/frmAssetRegistration'], function (jsModule) {
                    $.when(jsModule.ShowDialog(classID, parentObject, isSpinnerActive)).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            };
            //
            //вызов формы имущественной операции Отправить в ремонт
            self.ShowAssetToRepairForm = function (selectedObjects, operationName, lifeCycleStateOperationID) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmAssetToRepair'], function (jsModule) {
                    $.when(jsModule.ShowDialog(selectedObjects, operationName, lifeCycleStateOperationID, isSpinnerActive)).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            };
            //
            //вызов формы имущественной операции Вернуть из ремонта
            self.ShowAssetFromRepairForm = function (selectedObjects, operationName, lifeCycleStateOperationID) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmAssetFromRepair'], function (jsModule) {
                    $.when(jsModule.ShowDialog(selectedObjects, operationName, lifeCycleStateOperationID, isSpinnerActive)).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            };
            //
            //вызов формы имущественной операции Списать
            self.ShowAssetOffForm = function (selectedObjects, operationName, lifeCycleStateOperationID) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmAssetOff'], function (jsModule) {
                    $.when(jsModule.ShowDialog(selectedObjects, operationName, lifeCycleStateOperationID, isSpinnerActive)).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            };
            //вызов формы выдать право
            self.ShowLicenceConsumption = function (selectedObjects, operationName, lifeCycleStateOperationID, isEquip, isSubLi) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmLicenceConsumption'], function (jsModule) {
                    $.when(jsModule.ShowDialog(selectedObjects, operationName, lifeCycleStateOperationID, isSpinnerActive, isEquip, isSubLi)).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            }
            //вызов формы вернуть право
            self.ShowLicenceReturning = function (selectedObjects, operationName, lifeCycleStateOperationID, isSubLi) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmLicenceReturning'], function (jsModule) {
                    $.when(jsModule.ShowDialog(selectedObjects, operationName, lifeCycleStateOperationID, isSpinnerActive, isSubLi)).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            }
            //вызов формы применить продление
            self.ShowLicenceApplying = function (selectedObjects, operationName, lifeCycleStateOperationID) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmLicenceApplying'], function (jsModule) {
                    $.when(jsModule.ShowDialog(selectedObjects, operationName, lifeCycleStateOperationID, isSpinnerActive, 'edit')).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            }
            //вызов формы обновления
            self.ShowLicenceUpgrade = function (selectedObjects, operationName, lifeCycleStateOperationID) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmLicenceUpgrade'], function (jsModule) {
                    $.when(jsModule.ShowDialog(selectedObjects, operationName, lifeCycleStateOperationID, isSpinnerActive, 'edit')).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            }

            //вызов формы обновления версии по контракту
            self.ShowLicenceContractUpdate = function (selectedObjects, operationName, lifeCycleStateOperationID) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmLicenceContractUpdate'], function (jsModule) {
                    $.when(jsModule.ShowDialog(selectedObjects, operationName, lifeCycleStateOperationID, isSpinnerActive)).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            }

            //вызов формы активации
            self.ShowLicenceActive = function (selectedObjects, operationName, lifeCycleStateOperationID) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmLicenceActive'], function (jsModule) {
                    $.when(jsModule.ShowDialog(selectedObjects, operationName, lifeCycleStateOperationID, isSpinnerActive)).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            }
            //вызов формы структура пула
            self.ShowStructurePoolForm = function (pool) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmStructurePool'], function (jsModule) {
                    $.when(jsModule.ShowDialog(pool, jsModule.Modes.structurePool, isSpinnerActive)).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            };
            self.ShowPoolReferencesForm = function (pool) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmStructurePool'], function (jsModule) {
                    $.when(jsModule.ShowDialog(pool, jsModule.Modes.references, isSpinnerActive)).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            };
            //вызов формы применить продление (для просмотра существующего обновления)
            self.ShowLicenceApplyingReadOnly = function (softwareLicenceUpdateObject) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmLicenceApplying'], function (jsModule) {
                    $.when(jsModule.ShowDialog(softwareLicenceUpdateObject, getTextResource('SoftwareLicenceUpdate_RenewalСard'), null, isSpinnerActive, 'view')).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            };
            //вызов формы обновления версии по контракту (для просмотра существующего обновления)
            self.ShowLicenceContractUpdateReadOnly = function (softwareLicenceUpdateObject) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmLicenceUpdateReadonly'], function (jsModule) {
                    $.when(jsModule.ShowDialog(softwareLicenceUpdateObject, getTextResource('SoftwareLicenceUpdate_RenewalСard'), null, isSpinnerActive, 'view')).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            }
            //вызов формы обновления аредны (для просмотра существующего обновления аренды)
            self.ShowLicenceUpdateRent = function (softwareLicenceUpdateObject) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmLicenceUpdateRentReadonly'], function (jsModule) {
                    $.when(jsModule.ShowDialog(softwareLicenceUpdateObject, getTextResource('SoftwareLicenceUpdateType_RentContractRenewal'), null, isSpinnerActive, 'view')).done(function () {
                        retval.resolve();
                    });
                }); 
                return retval.promise();
            }; 
            //вызов формы обновления (для просмотра существующего обновления)
            self.ShowLicenceUpgradeReadOnly = function (softwareLicenceUpdateObject) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmLicenceUpgradeReadonly'], function (jsModule) {
                    $.when(jsModule.ShowDialog(softwareLicenceUpdateObject, getTextResource('SoftwareLicenceUpdate_RenewalСard'), null, isSpinnerActive)).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            };
            //
            //вызов формы имущественной операции Переместить
            self.ShowAssetMoveForm = function (selectedObjects, operationName, lifeCycleStateOperationID, operationType, availableClassID) {
                var retval = $.Deferred();
                require(['ui_forms/Asset/AssetOperations/frmAssetMove'], function (jsModule) {
                    $.when(jsModule.ShowDialog(selectedObjects, operationName, lifeCycleStateOperationID, isSpinnerActive, operationType, availableClassID)).done(function () {
                        retval.resolve();
                    });
                });
                return retval.promise();
            };
            //
            //вызов формы имущественной операции Поставить на учет
            self.ShowAssetRegistration = function (selectedObjects, operationName, lifeCycleStateOperationID, ko_object) {//ko_object - объект, в рамках которого открыта форма
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var retval = $.Deferred();
                //
                var ctrl = undefined;
                var mod = undefined;
                var buttons = {}
                buttons[getTextResource('RegisterAsset')] = function () {
                    var d = mod.RegisterAsset();
                    $.when(d).done(function (result) {
                        if (result)
                            ctrl.Close();
                        //
                        retval.resolve(result);
                    });
                };
                buttons[getTextResource('Close')] = function () {
                    retval.resolve(false);
                    ctrl.Close();
                };
                //                
                var formCaption = operationName ? operationName : getTextResource('AssetRegistration');
                //
                ctrl = new fc.control('assetRegistration', 'assetRegistration', formCaption, true, true, true, 750, 570, buttons, null, 'data-bind="template: {name: \'AssetForms/AssetOperations/AssetRegistration\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                //
                require(['models/AssetForms/AssetOperations/AssetRegistration'], function (vm) {
                    var mainRegionID = ctrl.GetRegionID();
                    var $region = $('#' + mainRegionID);
                    mod = new vm.ViewModel($region, selectedObjects, ko_object);
                    mod.LifeCycleStateOperationID = lifeCycleStateOperationID;
                    mod.Load();
                    //
                    $.when(ctrlD).done(function () {
                        ko.applyBindings(mod, document.getElementById(mainRegionID));
                        hideSpinner();
                    });
                });
                //
                return retval.promise();
            };
            //
            //вызов формы заместителя
            self.ShowDeputy = function (id, callBackFunction, curUser) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var retval = $.Deferred();
                //
                var ctrl = undefined;
                var mod = undefined;
                var buttons = {}
                buttons[getTextResource('ButtonSave')] = function () {
                    var d = mod.Save();
                    $.when(d).done(function (result) {
                        if (result) {
                            ctrl.Close();
                            callBackFunction(result);
                        }
                        //
                     retval.resolve(true);
                    });
                };
                buttons[getTextResource('Close')] = function () {
                    retval.resolve(false);
                    ctrl.Close();
                };
                var formCaption = id == null ? getTextResource('AddingSubstitutionProfileSettings') : getTextResource('EditingSubstitutionProfileSettings');
                //
                ctrl = new fc.control('settingstDeputy', 'settingstDeputy', formCaption, true, true, true, 400, 450, buttons, null, 'data-bind="template: {name: \'Account/frmDeputy\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                //
                require(['ui_forms/Account/frmDeputy'], function (vm) {
                    var mainRegionID = ctrl.GetRegionID();
                    var $region = $('#' + mainRegionID);
                    mod = new vm.ViewModel($region, id, curUser);
                    var LoadD = mod.Load();
                    //
                    $.when(ctrlD,LoadD).done(function () {
                        ko.applyBindings(mod, document.getElementById(mainRegionID));
                        hideSpinner();
                    });
                });
                return retval.promise();
            };
            //
            //вызов формы добавления контракта
            self.ShowServiceContractRegistrationForm = function () {
                $.when(operationIsGrantedD(212)).done(function (operation) {//OPERATION_ADD_SERVICECONTRACT: 212
                    if (operation == true)
                        require(['ui_forms/Asset/Contracts/frmContractRegistration'], function (jsModule) {
                            jsModule.ShowDialog(isSpinnerActive);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };
            //вызов формы добавления лицензии ПО
            self.ShowSoftwareLicenceAddForm = function (mode) {
                $.when(operationIsGrantedD(440)).done(function (operation) {//OPERATION_SOFTWARELICENCE_ADD: 440
                    if (operation == true)
                        require(['ui_forms/Asset/SoftwareLicence/frmSoftwareLicenceAdd'], function (jsModule) {
                            jsModule.ShowDialog(mode, isSpinnerActive);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };

            //вызов формы добавления лицензии ПО (по контракту)
            self.ShowSoftwareLicenceAddByContractForm = function () {
                $.when(operationIsGrantedD(440)).done(function (operation) {//OPERATION_SOFTWARELICENCE_ADD: 440
                    if (operation == true)
                        require(['ui_forms/Asset/SoftwareLicence/frmSoftwareLicenceAddByContract'], function (jsModule) {
                            jsModule.ShowDialog(isSpinnerActive);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };
            //
            //вызов формы контракта
            self.ShowServiceContract = function (id) {
                $.when(operationIsGrantedD(211)).done(function (operation) {//OPERATION_PROPERTIES_SERVICECONTRACT: 211
                    if (operation == true) {
                        require(['ui_forms/Asset/Contracts/frmContract'], function (jsModule) {
                            jsModule.ShowDialog(id, isSpinnerActive);
                        });
                    }
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };
            //
            //вызов формы дополнительного соглашения
            self.ShowServiceContractAgreement = function (id, serviceContractID) {
                $.when(operationIsGrantedD(873), operationIsGrantedD(872)).done(function (can_add, can_properties) {//OPERATION_ServiceContractAgreement_Properties = 872, OPERATION_ServiceContractAgreement_Add = 873
                    if (id && can_properties == true || !id && serviceContractID && can_add == true)
                        require(['ui_forms/Asset/Contracts/frmAgreement'], function (jsModule) {
                            jsModule.ShowDialog(id, serviceContractID, isSpinnerActive);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };
            //
            //вызов формы настройки цены по значениям НДС
            self.ShowCostNDS = function (ko_cost, ko_ndsTypeID, ndsPercentID, ko_ndsCustomValue, ko_timePeriodID, ko_canEdit, saveFunc) {
                require(['ui_forms/Asset/Contracts/frmCostNDS'], function (jsModule) {
                    jsModule.ShowDialog(ko_cost, ko_ndsTypeID, ndsPercentID, ko_ndsCustomValue, ko_timePeriodID, ko_canEdit, saveFunc, isSpinnerActive);
                });
            };
            //
            //вызов формы поставщика
            self.ShowSupplier = function (id) {
                $.when(operationIsGrantedD(217)).done(function (operation) {//OPERATION_PROPERTIES_SUPPLIER: 217
                    if (operation == true)
                        require(['ui_forms/Asset/frmSupplier'], function (jsModule) {
                            jsModule.ShowDialog(id, isSpinnerActive);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };
            //
            //вызов формы списка поставщиков
            self.ShowSupplierList = function (saveFunc) {
                $.when(operationIsGrantedD(217)).done(function (operation) {//OPERATION_PROPERTIES_SUPPLIER: 217
                    if (operation == true)
                        require(['ui_forms/Asset/frmSupplierList'], function (jsModule) {
                            jsModule.ShowDialog(saveFunc, isSpinnerActive);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };
            //вызов формы контактного лица
            self.ShowSupplierContactPerson = function (id, supplierID, supplierName, callback) {
                $.when(operationIsGrantedD(864)).done(function (operation) {//OPERATION_SupplierContactPerson_Properties: 864
                    if (operation == true)
                        require(['ui_forms/Asset/frmSupplierContactPerson'], function (jsModule) {
                            jsModule.ShowDialog(id, supplierID, supplierName, callback, isSpinnerActive);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };
            //
            //вызов формы списка контактных лиц
            self.ShowSupplierContactPersonList = function (contract, saveFunc) {
                $.when(operationIsGrantedD(864)).done(function (operation) {//OPERATION_SupplierContactPerson_Properties: 864
                    if (operation == true)
                        require(['ui_forms/Asset/frmSupplierContactPersonList'], function (jsModule) {
                            jsModule.ShowDialog(contract, saveFunc, isSpinnerActive);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };
            //
            //вызов формы Сопровождение оборудования и Сопровождение ПО
            self.ShowContractMaintenance = function (serviceContractID, objectID, objectClassID, HasAgreement) {
                $.when(operationIsGrantedD(880)).done(function (operation) {//OPERATION_ServiceContractMaintenance_Properties: 880
                    if (operation == true)
                        require(['ui_forms/Asset/Contracts/frmContractMaintenance'], function (jsModule) {
                            jsModule.ShowDialog(serviceContractID, objectID, objectClassID, isSpinnerActive, !HasAgreement);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };
            //
            //вызов формы списка лицензий
            self.ShowSoftwareLicenceLink = function (saveFunc, isMultiSelect) {
                $.when(operationIsGrantedD(441)).done(function (operation) {//OPERATION_SOFTWARELICENCE_PROPERTIES: 441
                    if (operation == true)
                        require(['ui_forms/Asset/frmSoftwareLicenceLink'], function (jsModule) {
                            jsModule.ShowDialog(saveFunc, isSpinnerActive, isMultiSelect);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };
            //вызов выдора продления/
            self.ShowSoftwareLicenceSelect = function () {
                $.when(operationIsGrantedD(441)).done(function (operation) {//OPERATION_SOFTWARELICENCE_PROPERTIES: 441
                    if (operation == true)
                        require(['ui_forms/Asset/AssetOperations/frmSoftwareTableSelector'], function (jsModule) {
                            jsModule.Show();
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };

            //
            //вызов формы выбора местоположения для оборудования
            self.ShowLocationForm = function (locationType, locationInfo, onSelected) {
                require(['ui_forms/Asset/frmAssetLocation'], function (jsModule) {
                    jsModule.ShowDialog(locationType, locationInfo, onSelected, isSpinnerActive);
                });
            };
            //
            //вызов формы Право контракта на ПО
            self.ShowServiceContractLicence = function (id, serviceContractID, IsContractAgreement, obj) {
                $.when(operationIsGrantedD(892), operationIsGrantedD(891)).done(function (can_add, can_properties) {//OPERATION_ServiceContractLicence_Properties = 891, OPERATION_ServiceContractLicence_Add = 892
                    if (id && can_properties == true || !id && serviceContractID && can_add == true)
                        require(['ui_forms/Asset/Contracts/frmContractLicence'], function (jsModule) {
                            jsModule.ShowDialog(id, serviceContractID, isSpinnerActive, IsContractAgreement, obj);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };
            //
            //вызов формы Ведомость инвентаризации
            self.ShowInventorySpecificationForm = function (id, isReadOnly) {
                $.when(operationIsGrantedD(896)).done(function (operation) {//OPERATION_InventorySpecification_Properties: 896
                    if (operation == true)
                        require(['ui_forms/SD/frmInventorySpecification'], function (jsModule) {
                            jsModule.ShowDialog(id, isReadOnly, isSpinnerActive);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };

            //вызов формы Лицензии ПО
            self.ShowSoftwareLicenceForm = function (id) {
                //OPERATION_SOFTWARELICENCE_PROPERTIES = 441
                $.when(operationIsGrantedD(441)).done(function (can_view) {
                    if (can_view) {
                        require(['ui_forms/Asset/SoftwareLicence/frmSoftwareLicence'], function (jsModule) {
                            jsModule.ShowDialog(id, isSpinnerActive);
                        });
                    }
                    else if (isSpinnerActive) {
                        hideSpinner();
                    }
                });
            };

            //вызов формы Сублицензии ПО
            self.ShowSoftwareSublicenseForm = function (id) {
                require(['ui_forms/Asset/SoftwareLicence/frmSublicense'], function (jsModule) {
                    jsModule.ShowDialog(id, isSpinnerActive);
                });
            };

            //вызов формы передачи сублицензии другому ЦРПО
            self.ShowSoftwareSublicenseTransferForm = function (id, callback) {
                require(['ui_forms/Asset/SoftwareLicence/frmSublicenseTransfer'], function (module) {
                    module.ShowDialog({ id: id, type: 'sublicence' }, callback);
                });
            }

            //вызов формы передачи сублицензии другому ЦРПО
            self.ShowSoftwareSublicenseTransferFromPoolForm = function (selecetdObject, callback) {
                require(['ui_forms/Asset/SoftwareLicence/frmSublicenseTransfer'], function (module) {
                    selecetdObject.type = 'pool';
                    module.ShowDialog(selecetdObject, callback);
                });
            }

            //вызов формы Конфигурационной единицы
            self.ShowConfigurationUnitForm = function (id) {
                require(['ui_forms/Asset/frmConfigurationUnit'], function (jsModule) {
                    jsModule.ShowDialog(id, isSpinnerActive);
                });
            };

            //вызов формы создания Конфигурационной единицы
            self.ShowConfigurationUnitRegistrationForm = function (device, parentObj, callBackFunc) {
                require(['ui_forms/Asset/frmConfigurationUnitRegistration'], function (jsModule) {
                    jsModule.ShowDialog(device, isSpinnerActive, parentObj, callBackFunc);
                });
            };

            //вызов формы Кластера
            self.ShowClusterForm = function (id) {
                require(['ui_forms/Asset/frmCluster'], function (jsModule) {
                    jsModule.ShowDialog(id, isSpinnerActive);
                });
            };

            //вызов формы добавления Кластера 
            self.ShowClusterRegistrationForm = function () {
              $.when(operationIsGrantedD(956)).done(function (operation) {
               if (operation == true)
                require(['ui_forms/Asset/frmClusterRegistration'], function (jsModule) {
                    jsModule.ShowDialog(isSpinnerActive);
                });
                  else if (isSpinnerActive)
                      hideSpinner();
              });
            };
            //вызов формы ЛО
            self.ShowLogicalObjectForm = function (id) {
                require(['ui_forms/Asset/frmLogicalObject'], function (jsModule) {
                    jsModule.ShowDialog(id, isSpinnerActive);
                });
            };
            //вызов формы добавления Логического объекта 
            self.ShowLogicalObjectRegistrationForm = function (parentObj, callBackFunc) {
                $.when(operationIsGrantedD(956)).done(function (operation) {//OPERATION_Cluster_Add
                    if (operation == true)
                        require(['ui_forms/Asset/frmLogicalObjectRegistration'], function (jsModule) {
                            jsModule.ShowDialog(isSpinnerActive, parentObj, callBackFunc);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };

            //вызов формы добавления Информационного объекта
            self.ShowDataEntityRegistrationForm = function () {
                $.when(operationIsGrantedD(615)).done(function (operation) {//OPERATION_DataEntity_Add
                if (operation == true)
                    require(['ui_forms/Asset/frmDataEntityRegistration'], function (jsModule) {
                        jsModule.ShowDialog(isSpinnerActive);
                    });
                else if (isSpinnerActive)
                    hideSpinner();
            });
        };
            //
            //вызов формы Информационного объекта
            self.ShowDataEntityObjectForm = function (id) {
                require(['ui_forms/Asset/frmDataEntityObject'], function (jsModule) {
                    jsModule.ShowDialog(id, isSpinnerActive);
                });
            };
        }
    }
    return module;
});