define(['knockout', 'jquery', 'ajax', 'usualForms', 'ttControl', 'models/SDForms/SDForm.LinkList', 'models/AssetForms/SdEntityList', 'dateTimeControl'], function (ko, $, ajaxLib, fhModule, tclib, linkListLib, callReferenceListLib, dtLib) {
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
            self.Load = function (id, classID) {
                self.mode(self.modes.main);
                //
                if (self.selectedObjects)
                    self.selectedObjects.forEach(function (el) {
                        self.LinkIDList.push(el.ID);
                    });
                //
                self.SelectedObjText('Выбрано объектов (' + self.LinkIDList.length + ')');
                //
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
            self.AssetToRepair = function () {
                var retD = $.Deferred();
                //
                var dateStart =  dtLib.GetMillisecondsSince1970(self.periodStartDateTime());
                var dateEnd = dtLib.GetMillisecondsSince1970(self.periodEndDateTime());
                if (dateStart > dateEnd) {
                    require(['sweetAlert'], function () {
                        swal('Дата начала не может быть больше даты окончания.');
                    });
                    return;
                }
                //
                var data =
                    {
                        'DeviceList': self.LinkIDList,
                        'LocationID': self.filterBlockModelKO() && self.filterBlockModelKO().SelectedObjectID() ? self.filterBlockModelKO().SelectedObjectID() : null,
                        'Cause': $('#founding')[0].value,
                        'ServiceCenterID': self.selectedServiceItem() ? self.selectedServiceItem().ID : null,
                        'ServiceContractID': self.selectedContractItem() ? self.selectedContractItem().ID : null,
                        'DateStart': dtLib.GetMillisecondsSince1970(self.periodStartDateTime()),
                    }
                self.ajaxControl.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'POST',
                        data: data,
                        url: 'assetApi/AssetToRepair'
                    },
                    function (newVal) {
                        if (newVal) {
                            retD.resolve(true);
                            require(['sweetAlert'], function () {
                                swal('Оборудование успешно отправлено в ремонт');
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
            //CALL REFERENCE BLOCK
            self.IsReadOnly = ko.observable(true);
            self.CanEditCalls = ko.observable(true);
            self.callList = new callReferenceListLib.LinkList(self.problem, self.objectClassID, self.$region.find('.cRef__b .tabContent').selector, self.IsReadOnly, self.CanEditCalls);
            //
            //LINKS BLOCK
            self.LinkIDList = [];
            self.CanEdit = ko.observable(false);
            self.linkList = new linkListLib.LinkList(null, null, self.$region.find('.links__b .tabContent').selector, self.IsReadOnly, self.CanEdit, self.LinkIDList);
            //
            self.mainClick = function () {
                self.mode(self.modes.main);
            };
            self.linksClick = function () {
                self.mode(self.modes.links);
            };
            //
            self.ajaxControl = new ajaxLib.control();
            self.ajaxControl2 = new ajaxLib.control();
            //
            self.filterBlockModelKO = ko.observable();
            self.ownerNavKO = ko.observable();
            self.molNavKO = ko.observable();
            //
            self.IsCrearLocVisible = ko.observable(false);
            self.IsCrearOwnerVisible = ko.observable(false);
            self.IsCrearMolVisible = ko.observable(false);

            //
            self.LocationName = ko.computed(function () {
                if (!self.filterBlockModelKO() || !self.filterBlockModelKO().SelectedObjectName() || self.filterBlockModelKO().SelectedObjectName().length == 0) {
                    self.IsCrearLocVisible(false);
                    return '(Выберите)';
                }
                else {
                    self.IsCrearLocVisible(true);
                    $('#x-clear').css('display', 'inline-block');
                    return self.filterBlockModelKO().SelectedObjectName();
                }
            });
            //
            self.OwnerName = ko.computed(function () {
                if (!self.ownerNavKO() || !self.ownerNavKO().SelectedOwnerName() || self.ownerNavKO().SelectedOwnerName().length == 0) {
                    self.IsCrearOwnerVisible(false);
                    return '(Выберите)';
                }
                else {
                    self.IsCrearOwnerVisible(true);
                    return self.ownerNavKO().SelectedOwnerName();
                }
            });
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
                $("#owner-navig").css('width', width + 'px');
                $("#mol-navig").css('width', width + 'px');
                //
                self.TabHeight(self.$region.height() - 100 + 'px');//form height - 100
                self.CallListHeight(self.$region.height() - 100 - 100 - 100 + 'px');
            };
            //
            self.controlStart = ko.observable(null);
            self.controlEnd = ko.observable(null);
            //
            self.periodStart = ko.observable(null);//always local string
            self.periodStart.subscribe(function (newValue) {
                if (self.controlStart().$isLoaded.state() != 'resolved')
                    return;
                //
                var dt = self.controlStart().dtpControl.length > 0 ? self.controlStart().dtpControl.datetimepicker('getValue') : null;
                //
                if (!newValue || newValue.length == 0)
                    self.periodStartDateTime(null);//clear field => reset value
                else if (dtLib.Date2String(dt) != newValue) {
                    self.periodStartDateTime(null);//value incorrect => reset value
                    self.periodStart('');
                }
                else
                    self.periodStartDateTime(dt);
            });
            self.periodStartDateTime = ko.observable(dtLib.StringIsDate(self.periodStart()) ? new Date(getUtcDate(self.periodStart())) : null);//always dateTime, auto convert serverUtcDateString to jsLocalTime
            //
            self.periodEnd = ko.observable(null);//always local string
            self.periodEnd.subscribe(function (newValue) {
                if (self.controlEnd().$isLoaded.state() != 'resolved')
                    return;
                //
                var dt = self.controlEnd().dtpControl.length > 0 ? self.controlEnd().dtpControl.datetimepicker('getValue') : null;
                //
                if (!newValue || newValue.length == 0)
                    self.periodEndDateTime(null);//clear field => reset value
                else if (dtLib.Date2String(dt) != newValue) {
                    self.periodEndDateTime(null);//value incorrect => reset value
                    self.periodEnd('');
                }
                else
                    self.periodEndDateTime(dt);
            });
            self.periodEndDateTime = ko.observable(dtLib.StringIsDate(self.periodEnd()) ? new Date(getUtcDate(self.periodEnd())) : null);//always dateTime, auto convert serverUtcDateString to jsLocalTime
            //
            self.InitDtp = function (dtpClass, dateTimeStr, dateTime, control) {
                var dtp = self.$region.find(dtpClass);
                var ctrl = new dtLib.control();
                ctrl.init(dtp, {
                    StringObservable: dateTimeStr,
                    ValueDate: dateTime(),
                    OnSelectDateFunc: function (current_time, $input) {
                        dateTime(current_time);
                        dateTimeStr(dtLib.Date2String(current_time));
                    },
                    OnSelectTimeFunc: function (current_time, $input) {
                        dateTime(current_time);
                        dateTimeStr(dtLib.Date2String(current_time));
                    },
                    HeaderText: ''
                });
                control(ctrl);
            };
            //
            self.ClickClearLocation = function () {
                self.filterBlockModelKO().SelectedObjectName('');
                self.filterBlockModelKO().SelectedObjectID(null);
                self.filterBlockModelKO().SelectedObjectClassID(null);
            };
            self.ClickClearOwner = function () {
                self.ownerNavKO().SelectedOwnerName('');
                self.ownerNavKO().SelectedOwnerID(null);
                self.ownerNavKO().SelectedOwnerClassID(null);
            };
            self.ClickClearMol = function () {
                self.molNavKO().SelectedMolName('');
                self.molNavKO().SelectedMolID(null);
                self.molNavKO().SelectedMolClassID(null);
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
                            self.ownerNav = new vm.ViewModel($isLoaded);
                            ko.cleanNode(document.getElementById('owner-navig'));
                            ko.applyBindings(self.ownerNav, document.getElementById('owner-navig'));
                            self.ownerNavKO(self.ownerNav);
                            self.ownerNav.InitOwnerTree();
                            hideSpinner();
                        });
                        //
                        require(['models/AssetForms/AssetOperations/Navigator'], function (vm) {
                            self.molNav = new vm.ViewModel($isLoaded);
                            ko.cleanNode(document.getElementById('mol-navig'));
                            ko.applyBindings(self.molNav, document.getElementById('mol-navig'));
                            self.molNavKO(self.molNav);
                            self.molNav.InitMolTree();
                            hideSpinner();
                        });
                    }
                    //
                    self.callList.CheckData();
                    //
                    if (!self.controlStart())
                        self.InitDtp('.repair-date-start', self.periodStart, self.periodStartDateTime, self.controlStart);
                    if (!self.controlEnd())
                        self.InitDtp('.repair-date-end', self.periodEnd, self.periodEndDateTime, self.controlEnd);
                    //
                    self.GetServiceCenterList();
                    //
                    self.SizeChanged();
                });
            };
            //
            self.selectedServiceItem = ko.observable(null);
            self.serviceCentrComboItems = ko.observableArray([]);
            self.getServiceCentrComboItems = function () {
                return {
                    data: self.serviceCentrComboItems(),
                    totalCount: self.serviceCentrComboItems().length
                };
            };
            //
            self.selectedServiceItem.subscribe(function (newValue) {
                self.GetServiceContractList();
            });
            //
            self.GetServiceCenterList = function () {
                self.ajaxControl.Ajax($region.find('.service-center-combobox'),
                   {
                       dataType: "json",
                       method: 'GET',
                       url: 'sdApi/GetServiceCenterList'
                   },
                   function (result) {
                       if (result && result.List) {
                           var selEl = null;
                           result.List.forEach(function (el) {
                               self.serviceCentrComboItems().push(el);
                           });
                           self.serviceCentrComboItems.valueHasMutated();
                           self.selectedServiceItem(selEl);
                       }
                   });
            };
            //
            self.selectedContractItem = ko.observable(null);
            self.serviceContractComboItems = ko.observableArray([]);
            self.getServiceContractComboItems = function () {
                return {
                    data: self.serviceContractComboItems(),
                    totalCount: self.serviceContractComboItems().length
                };
            };
            //
            self.GetServiceContractList = function () {
                var data =
                    {
                        'ServiceCenterID': self.selectedServiceItem().ID
                    };
                //
                self.ajaxControl2.Ajax($region.find('.service-contract-combobox'),
                   {
                       dataType: "json",
                       method: 'POST',
                       data: data,
                       url: 'sdApi/GetServiceContractList'
                   },
                   function (result) {
                       if (result && result.List) {
                           var selEl = null;
                           self.serviceContractComboItems.removeAll();
                           //
                           result.List.forEach(function (el) {

                               self.serviceContractComboItems().push(el);
                           });
                           self.serviceContractComboItems.valueHasMutated();
                           self.selectedContractItem(selEl);
                       }
                   });
            };
            //
            self.IsNavVisible = ko.observable(false);
            //
            self.ClickNav = function () {
                self.IsNavVisible(!self.IsNavVisible());
            };
            //
            self.IsOwnerNavVisible = ko.observable(false);
            //
            self.ClickOwnerNav = function () {
                self.IsOwnerNavVisible(!self.IsOwnerNavVisible());
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
    return module;
});