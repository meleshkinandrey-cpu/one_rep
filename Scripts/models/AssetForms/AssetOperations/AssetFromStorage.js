define(['knockout', 'jquery', 'ajax', 'usualForms', 'ttControl', 'models/SDForms/SDForm.LinkList', 'models/AssetForms/SdEntityList'], function (ko, $, ajaxLib, fhModule, tclib, linkListLib, callReferenceListLib) {
    var module = {
        ViewModel: function ($region, formCtrl, selectedObjects) {
            var self = this;
            var $isLoaded = $.Deferred();
            self.$region = $region;
            self.isLoaded = false;
            self.selectedObjects = selectedObjects;
            self.SelectedObjText = ko.observable('');
            //
            self.mode = ko.observable();
            //
            self.modes = {
                nothing: 'nothing',
                main: 'main',
                links: 'links'
            };
            //
            self.mode.subscribe(function (newValue) {
                if (newValue == self.modes.nothing)
                    return;
                //
                if (newValue == self.modes.links) {
                    self.linkList.CheckListData();
                }
            });
            //
            self.LinkIDList = [];
            //LINKS BLOCK
            self.CanEdit = ko.observable(false);
            self.linkList = new linkListLib.LinkList(null, null, self.$region.find('.links__b .tabContent').selector, self.IsReadOnly, self.CanEdit, self.LinkIDList);
            //
            //CALL REFERENCE BLOCK
            self.IsReadOnly = ko.observable(true);
            self.CanEditCalls = ko.observable(true);
            self.callList = new callReferenceListLib.LinkList(self.problem, self.objectClassID, self.$region.find('.cRef__b .tabContent').selector, self.IsReadOnly, self.CanEditCalls);
            //
            self.mainClick = function () {
                self.mode(self.modes.main);
            };
            self.linksClick = function () {
                self.mode(self.modes.links);
            };
            //
            self.ajaxControl = new ajaxLib.control();
            //
            self.filterBlockModelKO = ko.observable();
            self.molNavKO = ko.observable();
            //
            self.IsCrearLocVisible = ko.observable(false);
            self.IsCrearMolVisible = ko.observable(false);
            //
            self.LocationName = ko.computed(function () {
                if (!self.filterBlockModelKO() || !self.filterBlockModelKO().SelectedObjectName() || self.filterBlockModelKO().SelectedObjectName().length == 0) {
                    self.IsCrearLocVisible(false);
                    return '(Выберите)';
                }
                else {
                    self.IsCrearLocVisible(true);
                    return self.filterBlockModelKO().SelectedObjectName();
                }
            });
            //
            //
            self.MolName = ko.computed(function () {
                if (!self.molNavKO() || !self.molNavKO().SelectedMolName() || self.molNavKO().SelectedMolName().length == 0) {
                    self.IsCrearMolVisible(false);
                    return '(Выберите)';
                }
                else {
                    self.IsCrearMolVisible(true);
                    return self.molNavKO().SelectedMolName();
                }
            });
            //
            self.TabHeight = ko.observable(0);
            self.CallListHeight = ko.observable(0);
            //
            self.SizeChanged = function () {
                var width = $("#column1").outerWidth() - 10;
                $("#navig").css('width', width + 'px');
                $("#mol-navig").css('width', width + 'px');
                //
                self.TabHeight(self.$region.height() - 100 + 'px');//form height
                self.CallListHeight(self.$region.height() - 100 - 100  + 'px');
            };
            //
            self.ClickClearLocation = function () {
                self.filterBlockModelKO().SelectedObjectName('');
                self.filterBlockModelKO().SelectedObjectID(null);
                self.filterBlockModelKO().SelectedObjectClassID(null);
            };
            self.ClickClearMol = function () {
                self.molNavKO().SelectedMolName('');
                self.molNavKO().SelectedMolID(null);
                self.molNavKO().SelectedMolClassID(null);
            };
            //
            self.Load = function (id, classID) {
                self.mode(self.modes.main);
                //
                self.selectedObjects.forEach(function (el) {
                    self.LinkIDList.push(el.ID);
                });

                self.SelectedObjText('Выбрано объектов (' + self.LinkIDList.length + ')');

                var selectedObj = self.selectedObjects[0];
                //
                self.retD = $.Deferred();
                var data = { 'ID': selectedObj.ID, 'ClassID': selectedObj.ClassID }
                self.ajaxControl.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'GET',
                        data: data,
                        url: 'sdApi/GetObjectLocation'
                    },
                    function (newVal) {
                        var loadSuccessD = $.Deferred();
                        var processed = false;
                        //
                        if (newVal) {
                            if (newVal.Result == 0) {//success
                                self.LocationClassID = newVal.ClassID;
                                self.LocationID = newVal.LocationID;
                                self.retD.resolve();
                            }
                        }
                    });
            };
            //
            self.SetFromStorage = function () {
                var retD = $.Deferred();
                //
                var data =
                    {
                        'DeviceList': self.LinkIDList,
                        'LocationID': self.filterBlockModelKO() && self.filterBlockModelKO().SelectedObjectID() ? self.filterBlockModelKO().SelectedObjectID() : null,
                        'UtilizerID': self.molNavKO() && self.molNavKO().SelectedMolID() ? self.molNavKO().SelectedMolID() : null,
                        'UtilizerClassID': self.molNavKO() && self.molNavKO().SelectedMolClassID() ? self.molNavKO().SelectedMolClassID() : null,
                        'UtilizerName': self.molNavKO() && self.molNavKO().SelectedMolName() ? self.molNavKO().SelectedMolName() : null,
                    }
                self.ajaxControl.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'POST',
                        data: data,
                        url: 'sdApi/SetFromStorage'
                    },
                    function (newVal) {
                        if (newVal) {
                            retD.resolve(true);
                            require(['sweetAlert'], function () {
                                swal('Оборудование успешно установлено со склада');
                            });
                        }
                        else {//not success
                            retD.resolve(false);
                        }
                    });
                //
                return retD.promise();
            };
            //
            self.AfterRender = function () {
                $.when(self.retD).done(function () {
                    if (!self.isLoaded) {
                        self.isLoaded = true;
                        require(['models/AssetForms/AssetOperations/Navigator'], function (vm) {
                            self.filterBlockModel = new vm.ViewModel($isLoaded);

                            ko.cleanNode(document.getElementById('navig'));
                            ko.applyBindings(self.filterBlockModel, document.getElementById('navig'));
                            self.filterBlockModelKO(self.filterBlockModel);
                            self.filterBlockModel.InitLocationTree(self.LocationID, self.LocationClassID);
                            hideSpinner();
                        });
                        //
                        require(['models/AssetForms/AssetOperations/Navigator'], function (vm) {
                            self.molNav = new vm.ViewModel($isLoaded);
                            ko.cleanNode(document.getElementById('mol-navig'));
                            ko.applyBindings(self.molNav, document.getElementById('mol-navig'));
                            self.molNavKO(self.molNav);
                            self.molNav.InitMolTree(selectedObj.UserID);
                            hideSpinner();
                        });
                    }
                    //
                    self.callList.CheckData();
                    //
                    self.SizeChanged();
                });
            };
            //
            self.selectedComboItem = ko.observable(null);
            self.selectedComboItem.subscribe(function (newValue) {
                var actionsLabel = self.OperationList()[0];
                if (self.selectedComboItem() == actionsLabel)
                    return;
                //
                newValue.Command();
                //
                self.selectedComboItem(actionsLabel);
            });
            self.comboItems = ko.observableArray([]);
            self.getComboItems = function () {
                return {
                    data: self.comboItems(),
                    totalCount: self.comboItems().length
                };
            };
            //
            self.IsNavVisible = ko.observable(false);
            //
            self.ClickNav = function () {
                self.IsNavVisible(!self.IsNavVisible());
            };
            //
            self.IsMolNavVisible = ko.observable(false);
            //
            self.ClickMolNav = function () {
                self.IsMolNavVisible(!self.IsMolNavVisible());
            };
            //
            self.ContextMenuVisible = ko.observable(false);
            //
            self.LinkSdObjectClick = function (data, e) {
                var isVisible = self.ContextMenuVisible();
                self.ContextMenuVisible(!isVisible);
                //
                e.stopPropagation();
            };
            //
            self.formClick = function () {
                self.ContextMenuVisible(false);
            };
            //
            self.FoundingNumberStr = ko.observable(null);
            //
            self.LinkCall = function () {
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowSearcherLite([701], null, null, null, self.FoundingNumberStr);
                });
            };
            //
            self.LinkWorkorder = function () {
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowSearcherLite([119], null, null, null, self.FoundingNumberStr);
                });
            };
            //
            self.LinkProblem = function () {
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowSearcherLite([702], null, null, null, self.FoundingNumberStr);
                });
            };
        }
    }
    //
    return module;
});

