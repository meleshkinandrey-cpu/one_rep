define(['jquery', 'knockout', 'formControl', 'usualForms'], function ($, ko, fc, ufh) {
    var module = {
        formHelper: function (isSpinnerActive) {
            var self = this;
            //
            //
            self.ShowActivesRequestSpecification = function (ars_object, canEdit_object, onEditComplete) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {};
                var ctrl = undefined;
                var mod = undefined;
                buttons[getTextResource('Close')] = function () { ctrl.Close(); }
                if (canEdit_object())
                {
                    buttons[getTextResource('DoneButtonText')] = function () {
                        if (mod && onEditComplete && ((canEdit_object && canEdit_object()) || (mod.isEditModel && mod.isEditModel()))) {
                            var values = mod.GetNewValues();
                            onEditComplete(values);
                        }
                        //
                        ctrl.Close();
                    }
                }
                
                //
                var header = getTextResource('ActivesRequestSpecificationHeader');
                var re = /%/gi;
                header = header.replace(re, ars_object.OrderNumber);
                //
                ctrl = new fc.control('ActivesRequestSpecificationForm', 'ActivesRequestSpecificationForm', header, true, true, true, 1020, 400, buttons, null, 'data-bind="template: {name: \'FinanceForms/ActivesRequestSpecificationForm\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                var ctrlD = ctrl.Show();
                //
                ctrl.ExtendSize(1020, 400);
                //
                require(['models/FinanceForms/ActivesRequestSpecificationForm'], function (vm) {
                    var region = $('#' + ctrl.GetRegionID());
                    mod = new vm.ViewModel(ars_object, canEdit_object, region);
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD, mod.LoadD).done(function (ctrlResult, loadResult) {
                        hideSpinner();
                    });
                });
            };
            //
            self.ShowPurchaseSpecification = function (ps_object, canEdit_object, onEditComplete) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {};
                var ctrl = undefined;
                var mod = undefined;
                buttons[getTextResource('Close')] = function () { ctrl.Close(); }
                if (canEdit_object()) {
                    buttons[getTextResource('DoneButtonText')] = function () {
                        if (mod && onEditComplete && ((canEdit_object && canEdit_object()) || (mod.isEditModel && mod.isEditModel()))) {
                            var values = mod.GetNewValues();
                            onEditComplete(values);
                        }
                        //
                        ctrl.Close();
                    }
                }
                //
                var header = getTextResource('PurchaseSpecificationHeader');
                var re = /%/gi;
                header = header.replace(re, ps_object.OrderNumber);
                //
                ctrl = new fc.control('PurchaseSpecificationForm', 'PurchaseSpecificationForm', header, true, true, true, 1020, 650, buttons, null, 'data-bind="template: {name: \'FinanceForms/PurchaseSpecificationForm\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                var ctrlD = ctrl.Show();
                //
                ctrl.ExtendSize(1020, 650);
                //
                require(['models/FinanceForms/PurchaseSpecificationForm'], function (vm) {
                    var region = $('#' + ctrl.GetRegionID());
                    mod = new vm.ViewModel(ps_object, canEdit_object, region);
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD, mod.LoadD).done(function (ctrlResult, loadResult) {
                        hideSpinner();
                    });
                });
            };
            //
            self.ShowActivesRequestSpecificationSearch = function (objectInfo, callbackFunc) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var firstButtons = {};
                firstButtons = {
                    "cancel": {
                        text: getTextResource('Close'),
                        'class': 'GrayUIButton',
                        click: function () { ctrl.Close(); }
                    }
                };
                //
                var ctrl = undefined;
                var name = 'arsSearchForm';
                ctrl = new fc.control(name, name, getTextResource('PS_CreateByArsHeader'), true, true, true, 800, 500, firstButtons, null, 'data-bind="template: {name: \'FinanceForms/Search/MainForm\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                ctrl.ExtendSize(1100, 800);
                //
                require(['models/FinanceForms/Search/ActivesRequestSpecificationFindForm'], function (vm) {
                    var mainRegionID = ctrl.GetRegionID();
                    var $region = $('#' + mainRegionID);
                    var mod = new vm.ViewModel($region, objectInfo);
                    //
                    mod.SetCLearButtonsList = function () {
                        var buttons = {};
                        buttons = {
                            "cancel": {
                                text: getTextResource('Close'),
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
                                text: getTextResource('Close'),
                                'class': 'GrayUIButton',
                                click: function () { ctrl.Close(); }
                            },
                            'attach': {
                                text: getTextResource('Add'),
                                click: function () {
                                    if (callbackFunc)
                                        callbackFunc(mod.GetFinalList(), false, null, null);
                                    //
                                    ctrl.Close();
                                }
                            }
                        };
                        //
                        ctrl.UpdateButtons(buttons);
                    };
                    //
                    mod.SetAdvancedButtonsList = function (currentTypeID) {
                        var buttons = {};
                        buttons = {
                            "cancel": {
                                text: getTextResource('Close'),
                                'class': 'GrayUIButton',
                                click: function () { ctrl.Close(); }
                            },
                            'attachMany': {
                                text: getTextResource('ARS__Search_AddMany'),
                                click: function () {
                                    if (callbackFunc)
                                        callbackFunc(mod.GetFinalList(), false, null, null);
                                    //
                                    ctrl.Close();
                                }
                            },
                            'attachWithModelChoose': {
                                text: getTextResource('ARS__Search_AddWithModelChoose'),
                                click: function () {
                                    if (callbackFunc && currentTypeID) {
                                        self.ShowSelectModelForPurchaseSpecification(currentTypeID, function (selectedValue) {
                                            if (!selectedValue)
                                                return;
                                            //
                                            callbackFunc(mod.GetFinalList(), true, selectedValue.ID, selectedValue.ClassID);
                                            ctrl.Close();
                                        });
                                    }
                                    else ctrl.Close();
                                }
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
            self.ShowSelectModelForPurchaseSpecification = function (typeID, callbackFunc) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {};
                var ctrl = undefined;
                var mod = undefined;
                buttons[getTextResource('CancelButtonText')] = function () {
                    ctrl.Close();
                };
                buttons[getTextResource('ButtonSave')] = function () {
                    if (callbackFunc) {
                        var retval = mod.GetValues();
                        //
                        if (retval) {
                            callbackFunc(retval);
                            ctrl.Close();
                        }
                    }
                    else ctrl.Close();
                };
                //
                ctrl = new fc.control('SelectModelForPurchaseSpecification', 'SelectModelForPurchaseSpecification', getTextResource('ARS_SelectModelHeader'), true, false, false, 450, 540, buttons, null, 'data-bind="template: {name: \'FinanceForms/Search/SelectModelForPurchaseSpecification\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                //
                require(['models/FinanceForms/Search/SelectModelForPurchaseSpecification'], function (vm) {
                    mod = new vm.ViewModel(typeID, callbackFunc, ctrl.GetRegionID());
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD, mod.LoadD).done(function () {
                        hideSpinner();
                        //
                        mod.Initialize();
                    });
                });
            };
            //
            self.ShowGoodsInvoiceByID = function (goodsInvoiceID) {
                require(['ajax', 'models/FinanceForms/GoodsInvoice', 'models/SDForms/WorkOrderForm.WorkOrder'], function (ajaxLib, invoiceLib, woLib) {
                    var ajaxControl = new ajaxLib.control();
                    //
                    ajaxControl.Ajax(null,
                        {
                            dataType: "json",
                            method: 'GET',
                            data: { GoodInvoiceID: goodsInvoiceID },
                            url: 'finApi/GetGoodsInvoice'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var goodsInvoiceBL = newVal.Data;
                                var goodsInvoice = new invoiceLib.GoodsInvoice(null, goodsInvoiceBL); //without link to imList
                                //
                                var workOrderID = goodsInvoiceBL.WorkOrderID;
                                ajaxControl.Ajax(null,
                                        {
                                            dataType: "json",
                                            method: 'GET',
                                            data: { 'id': workOrderID },
                                            url: 'sdApi/GetWorkOrder'
                                        },
                                        function (newVal) {
                                            if (newVal && newVal.Result == 0) {//success
                                                var woInfo = newVal.WorkOrder;
                                                if (woInfo && woInfo.ID) {
                                                    var wrapper = {
                                                        CanEdit: function () { return false; }
                                                    };
                                                    var ko_object = new woLib.WorkOrder(wrapper, woInfo);
                                                    //
                                                    var operation = 0;//show-edit
                                                    //
                                                    self.ShowGoodsInvoice(ko_object, goodsInvoice, operation, null, ko.observable(wrapper.CanEdit()));
                                                }
                                            }
                                        });
                            }
                        });
                });
            };
            self.ShowGoodsInvoice = function (ko_object, goodsInvoice, operation, onEditComplete, ko_canEdit) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {};
                var ctrl = undefined;
                var mod = undefined;
                //
                self.SaveFunc = function () {
                    if (mod && onEditComplete) {
                        var values = mod.GetGoodsInvoice(operation);
                        //
                        if (!values.DocumentNumber) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('AddInvoice'), getTextResource('NeedFillField').replace('{0}', getTextResource('DocumentNumber')), 'info');
                            });
                            return false;
                        }
                        else if (!values.UtcDateCreated) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('AddInvoice'), getTextResource('NeedFillField').replace('{0}', getTextResource('DateCreated')), 'info');
                            });
                            return false;
                        }
                        else if (!values.ConsignorID) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('AddInvoice'), getTextResource('NeedFillField').replace('{0}', getTextResource('Consignor')), 'info');
                            });
                            return false;
                        }
                        else {
                            onEditComplete(values);
                            return true;
                        }
                    }
                };
                //
                buttons[getTextResource('Close')] = function () { ctrl.Close(); }
                if (onEditComplete && ko_canEdit()) {
                    buttons[getTextResource('DoneButtonText')] = function () {
                        if (self.SaveFunc())
                            ctrl.Close();
                    }
                }
                //
                var formCaption = goodsInvoice.ExistsInDataBase() ? getTextResource('GoodsInvoiceEdit') : getTextResource('GoodsInvoiceCreate');
                //
                ctrl = new fc.control('GoodsInvoiceForm', 'GoodsInvoiceForm', formCaption, true, true, true, 900, 650, buttons, null, 'data-bind="template: {name: \'FinanceForms/GoodsInvoiceForm\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                var ctrlD = ctrl.Show();
                //
                require(['models/FinanceForms/GoodsInvoiceForm'], function (vm) {
                    var region = $('#' + ctrl.GetRegionID());
                    mod = new vm.ViewModel(ko_object, goodsInvoice, ko_canEdit, region, self.SaveFunc);
                    //
                    var oldSizeChanged = ctrl.SizeChanged;
                    ctrl.SizeChanged = function () {
                        oldSizeChanged();
                        mod.SizeChanged();
                    };
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD, mod.LoadD).done(function (ctrlResult, loadResult) {
                        hideSpinner();
                    });
                });
            };
            //
            self.ShowGoodsInvoiceSpecificationLink = function (objectInfo, callbackFunc) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var firstButtons = {};
                firstButtons = {
                    "cancel": {
                        text: getTextResource('Close'),
                        'class': 'GrayUIButton',
                        click: function () { ctrl.Close(); }
                    }
                };
                //
                var ctrl = undefined;
                var name = 'goodsInvoiceSpecificationLinkForm';
                ctrl = new fc.control(name, name, getTextResource('AddInvoiceSpecification'), true, true, true, 1200, 700, firstButtons, null, 'data-bind="template: {name: \'FinanceForms/GoodsInvoiceSpecificationLink/MainForm\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                ctrl.ExtendSize(1100, 800);
                //
                require(['models/FinanceForms/GoodsInvoiceSpecificationLink/GoodsInvoiceSpecificationLink'], function (vm) {
                    var mainRegionID = ctrl.GetRegionID();
                    var $region = $('#' + mainRegionID);
                    var mod = new vm.ViewModel($region, objectInfo);
                    //
                    mod.SaveFunc = function () {
                        if (mod && callbackFunc) {
                            var value = mod.GetInvoiceSpecificationData();
                            if (!value)
                                return false;
                            //
                            if (!value.ProductCatalogModelID || !value.ProductCatalogModelClassID) {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('AddInvoiceSpecification'), getTextResource('NeedFillField').replace('{0}', getTextResource('AssetNumber_ModelName')), 'info');
                                });
                                return false;
                            }
                            else if (!value.Price) {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('AddInvoiceSpecification'), getTextResource('NeedFillField').replace('{0}', getTextResource('SpecificationForm_PriceForOne')), 'info');
                                });
                                return false;
                            }
                            else if (!value.UnitID) {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('AddInvoiceSpecification'), getTextResource('NeedFillField').replace('{0}', getTextResource('PurchaseSpecification_Unit')), 'info');
                                });
                                return false;
                            }
                            else {
                                callbackFunc(value);
                                return true;
                            }
                        }
                        return false;
                    };
                    //
                    mod.SetClearButtonsList = function () {
                        var buttons = {};
                        buttons = {
                            "cancel": {
                                text: getTextResource('Close'),
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
                                text: getTextResource('Close'),
                                'class': 'GrayUIButton',
                                click: function () { ctrl.Close(); }
                            },
                            'attach': {
                                text: getTextResource('Add'),
                                click: function () {
                                    if (mod.SaveFunc())
                                        ctrl.Close();
                                }
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
            self.ShowInvoiceSpecification = function (ko_object, ps_object, canEdit_object, onEditComplete) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {};
                var ctrl = undefined;
                var mod = undefined;
                buttons[getTextResource('Close')] = function () { ctrl.Close(); }
                if (canEdit_object())
                    buttons[getTextResource('DoneButtonText')] = function () {
                        if (mod && onEditComplete) {
                            var invoiceSpec = mod.GetInvoiceSpecification();
                            //
                            if (!invoiceSpec.Price) {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('AddInvoiceSpecification'), getTextResource('NeedFillField').replace('{0}', getTextResource('SpecificationForm_PriceForOne')), 'info');
                                });
                                return false;
                            }
                            else {
                                onEditComplete(invoiceSpec);
                                ctrl.Close();
                                return true;
                            }
                        }
                    }
                //
                var header = getTextResource('InvoiceSpecification');
                //
                ctrl = new fc.control('InvoiceSpecificationForm', 'InvoiceSpecificationForm', header, true, true, true, 1200, 700, buttons, null, 'data-bind="template: {name: \'FinanceForms/Controls/GoodsInvoiceSpecification\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                var ctrlD = ctrl.Show();
                //
                ctrl.ExtendSize(1200, 700);
                //
                require(['models/FinanceForms/GoodsInvoiceSpecificationControl'], function (vm) {
                    var region = $('#' + ctrl.GetRegionID());
                    mod = new vm.ViewModel(ko.observable(ps_object), null, canEdit_object, region);
                    //
                    var oldSizeChanged = ctrl.SizeChanged;
                    ctrl.SizeChanged = function () {
                        oldSizeChanged();
                        mod.SizeChanged();
                    };
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD, mod.LoadD).done(function (ctrlResult, loadResult) {
                        hideSpinner();
                    });
                });
            };
            //
            //Хитрое согласование
            self.ShowFinanceNegotiation = function (negID, financeType, objID, objClassID, callbackFunc, settingCommentPlacet, settingCommentNonPlacet, comment) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var firstButtons = {};
                firstButtons = {
                    "cancel": {
                        text: getTextResource('Close'),
                        'class': 'GrayUIButton',
                        click: function () { ctrl.Close(); }
                    }
                };
                //
                var ctrl = undefined;
                var mod = undefined;
                //
                ctrl = new fc.control('negFinVote', 'negFinVote', getTextResource('CustomNegotiationHeader'), true, true, true, 1000, 650, firstButtons, null, 'data-bind="template: {name: \'Negotiation/CustomFinanceNegotiation\', afterRender: AfterRender }"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                //
                require(['models/FinanceForms/Negotiation/CustomNegotiation'], function (vm) {
                    var mainRegionID = ctrl.GetRegionID();
                    var $region = $('#' + mainRegionID);
                    var mod = new vm.ViewModel(negID, financeType, objID, objClassID, $region, comment);
                    if (settingCommentPlacet)
                        mod.SettingCommentPlacet(settingCommentPlacet);
                    if (settingCommentNonPlacet)
                        mod.SettingCommentNonPlacet(settingCommentNonPlacet);
                    //
                    mod.SetCLearButtonsList = function () {
                        var buttons = {};
                        buttons = {
                            "cancel": {
                                text: getTextResource('Close'),
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
                                text: getTextResource('Close'),
                                'class': 'GrayUIButton',
                                click: function () { ctrl.Close(); }
                            },
                            'save': {
                                text: getTextResource('Button_EndNegotiation'),
                                click: function() {
                                    //
                                    if (mod.SettingCommentPlacet() == true && mod.Vote() == 1)
                                        if (mod.Comment().length < 5) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('CommentMustCharacters'), 'error');
                                            });
                                            return;
                                        }
                                    if (mod.SettingCommentNonPlacet() == true && mod.Vote() == 2)
                                        if (mod.Comment().length < 5) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('CommentMustCharacters'), 'error');
                                            });
                                            return;
                                        }
                                    //
                                    if (callbackFunc) {
                                        $.when(mod.Save()).done(function (result) {
                                            callbackFunc(result);
                                        });
                                    }
                                    //
                                    ctrl.Close();
                                }
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
                    });
                });
            };
            //
            //список бюджетов
            self.ShowFinanceBudgetList = function (selectedFinanceBudgetID, onSelectedID) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var bindElement = null;
                var buttons = {};
                var selectedRows_handle = null;
                var ctrl = undefined;
                var mod = undefined;
                var btnSelectClick = function () {
                    if (mod) {
                        var selectedModel = mod.selectedItemsModel();
                        var selectedRows = selectedModel.SelectedRows();
                        if (selectedRows.length == 1) {
                            onSelectedID(selectedModel.GetObjectID(selectedRows[0]).toUpperCase());
                            ctrl.Close();
                        }
                    }
                }
                var btnCancelClick = function () { ctrl.Close(); }
                buttons[getTextResource('Close')] = btnCancelClick;
                //
                var afterClose = function () {
                    ko.cleanNode(bindElement);
                    if (selectedRows_handle)
                        selectedRows_handle.dispose();
                };
                ctrl = new fc.control('FinanceBudgetFormList', 'FinanceBudgetFormList', getTextResource('FinanceBudgetTable'), true, true, true, 400, 350, buttons, afterClose, 'data-bind="template: {name: \'FinanceForms/Budget/FinanceBudgetTable\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                ctrl.BeforeClose = function () {
                    if (mod)
                        mod.Unload();
                };
                var oldSizeChanged = ctrl.SizeChanged;
                ctrl.SizeChanged = function () {
                    oldSizeChanged();
                    if (mod)
                        mod.resizeTable();
                };
                var ctrlD = ctrl.Show();
                ctrl.ExtendSize(500, 650);
                //
                var formModel = {
                    AfterRender: function () {
                        $.when(ctrlD).done(function (ctrlResult) {//form exists
                            var columnSettingsD = $.Deferred();
                            var tableD = $.Deferred();
                            //
                            var region = $('#' + ctrl.GetRegionID());
                            var $columnButton = region.find('.columnSettingsButton');
                            var $workplace = region.find('.listRegion');
                            var $table = region.find('.regionTable');
                            var $columns = region.find('.regionColumns');
                            //
                            if ($columnButton.length > 0)
                                showSpinner($columnButton[0]);
                            if ($workplace.length > 0)
                                showSpinner($workplace[0]);
                            //                
                            require(['models/FinanceForms/Budget/FinanceBudgetTable'], function (vm) {
                                var tableModel = new vm.ViewModel($table);
                                tableModel.getContainerHeight = function () { return region.height() - region.find(".b-content-table__icons").outerHeight(); }
                                region.css('overflow-y', 'hidden');
                                mod = tableModel;
                                //
                                ko.applyBindings(tableModel, $table[0]);
                                tableD.resolve(tableModel);
                                //
                                require(['models/Table/Columns'], function (vm) {
                                    var columnsModel = new vm.ViewModel(tableModel, $columns, $columnButton, $workplace);
                                    ko.applyBindings(columnsModel, $columns[0]);
                                    if ($columnButton.length > 0)
                                        hideSpinner($columnButton[0]);
                                    columnSettingsD.resolve(columnsModel);
                                });
                            });
                            //
                            $.when(columnSettingsD, tableD).done(function (columnsModel, tableModel) {
                                $.when(userD).done(function (user) {
                                    var loadD = tableModel.Load();
                                    $.when(loadD).done(function () {
                                        $table[0].style.visibility = 'visible';
                                        if ($workplace.length > 0)
                                            hideSpinner($workplace[0]);
                                        //
                                        var selectedModel = mod.selectedItemsModel();
                                        {//update buttons of dialog
                                            selectedRows_handle = selectedModel.SelectedRows.subscribe(function (newValue) {
                                                var newButtons = {};
                                                if (newValue.length == 1)
                                                    newButtons[getTextResource('Select')] = btnSelectClick;
                                                newButtons[getTextResource('Close')] = btnCancelClick;
                                                //
                                                ctrl.UpdateButtons(newButtons);
                                            });
                                        }
                                        //
                                        if (selectedFinanceBudgetID)
                                            mod.SelectedID(selectedFinanceBudgetID.toUpperCase());
                                        //
                                        columnsModel.refreshListSize();
                                    });
                                });
                            });
                            //
                            hideSpinner();
                        });
                    }
                };
                bindElement = document.getElementById(ctrl.GetRegionID());
                ko.applyBindings(formModel, bindElement);
            };
            //
            //бюджет
            self.ShowFinanceBudget = function (id) {
                $.when(operationIsGrantedD(id == null ? 853 : 852)).done(function (operation) {
                    if (operation == true)
                        require(['ui_forms/Finances/frmFinanceBudget'], function (jsModule) {
                            jsModule.ShowDialog(id, isSpinnerActive);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };
            //
            //строка бюджета
            self.ShowFinanceBudgetRow = function (id) {
                $.when(operationIsGrantedD(id == null ? 857 : 856)).done(function (operation) {
                    if (operation == true)
                        require(['ui_forms/Finances/frmFinanceBudgetRow'], function (jsModule) {
                            jsModule.ShowDialog(id, isSpinnerActive);
                        });
                    else {
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                        });
                        //
                        if (isSpinnerActive)
                            hideSpinner();
                    }
                });
            };
            //
            //корректировка строки бюджета
            //идентификатор корректировки/null, null/строка бюджета старая, null/строка бюджета новая
            self.ShowFinanceBudgetRowAdjustment = function (id, oldRow, newRow) {
                var retval = $.Deferred();
                require(['ui_forms/Finances/frmFinanceBudgetRowAdjustment'], function (jsModule) {
                    $.when(jsModule.ShowDialog(id, oldRow, newRow, isSpinnerActive)).done(function (val) {
                        retval.resolve(val);
                    });
                });
                return retval.promise();
            };
            //
            //искатель строк бюджета
            self.ShowFinanceBudgetRowSearcher = function (purchaseSpecificationOrWorkOrderID, onSelectFunc) {
                require(['ui_forms/Finances/frmFinanceBudgetRowSearcher'], function (jsModule) {
                    jsModule.ShowDialog(purchaseSpecificationOrWorkOrderID, onSelectFunc, isSpinnerActive);
                });
            };
            //
            //отметить исполнения для строки спецификации закупки
            self.ShowExecutePurchaseSpecification = function (purchaseSpecificationID) {
                require(['ui_forms/Finances/frmExecutePurchaseSpecification'], function (jsModule) {
                    jsModule.ShowDialog(purchaseSpecificationID, isSpinnerActive);
                });
            };
        }
    }
    return module;
});