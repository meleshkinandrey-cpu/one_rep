define(['knockout', 'jquery', 'ajax', 'usualForms',
    'models/SDForms/SDForm.User', 'models/ClientSearch/ClientSearchCallList', 'models/ClientSearch/clientSearchAssetList'],
    function (ko, $, ajaxLib, fhModule,
        userLib, ClientSearchCallList, ClientSearchAssetList) {
    var module = {
        ViewModel: function () {
            var self = this;
            self.isLoaded = $.Deferred();//afterRender
            self.searcherModelD = $.Deferred();
            //
            self.Phrase = ko.observable('');
            self.SelectedClient = ko.observable(null);
            self.MainRegionID = null;
            self.ajaxControl = new ajaxLib.control();
            self.CSCallList = ko.observable(null);
            self.callList = ko.observable(null);
            self.CallListSearch = ko.observable(null);
            self.assetList = ko.observable(null);
            self.CanShow = ko.observable(false);
            //71 user.properties
            $.when(operationIsGrantedD(71)).done(function (user_properties) {
                if (user_properties == true)
                    self.CanShow = ko.observable(true);
            });
            self.CanShowDeputy = ko.observable(false);
            $.when(operationIsGrantedD(241)).done(function (user_update) {
                if (user_update == true)
                    self.CanShowDeputy = ko.observable(true);
            });
            self.CanEdit = ko.observable(true);//используется в LinkList
            self.ReadOnly = ko.observable(false);
            //
            self.SearchFinished = ko.observable(false);
            //
            self.callHeight = ko.observable('50%');
            self.assetHeight = ko.observable('50%');
            //
            self.AssetListStyle = ko.computed(function () {
            });

            self.CallListStyle = ko.computed(function () {
            });

            self.searchResults = {
                nothingFound: 'nothingFound',
                allOK: 'allOK'
            };
            self.searchMode = {
                context: 0,
                user: 1,
                callClient: 2
            };
            self.advancedSearchMode = {
                searchAllDB: 0,
                searchInCurrentList: 1,
                searchInSearch: 2
            };
            self.formID = '';
            self.searchResult = ko.observable(self.searchResults.allOK);
            //
            self.IsClientMode = ko.observable(true);//sd.user form
            var userWithDependencies = function (user) {
                var uself = this;
                uself.User = user;
                uself.ID = ko.observable(uself.User().ID);
                uself.CallCount = function () {
                    return 0;
                }
            };
            //
            self.ClientFullName = function () {
                if (self.SelectedClient() != null)
                    return self.SelectedClient().FullName;
                return '';
            }
            self.GetClientMainInfo = function () {
                var client = self.SelectedClient();
                if (client == null)
                    return '';
                return client.FullName + '<br/>' + client.Email + '<br/>' + client.PositionName;
            }
            self.GetClientAdditionInfo = function () {
                var client = self.SelectedClient();
                if (client == null)
                    return '';
                return client.OrganizationName + '<br/>' + getTextResource('UserRoom') + ': ' + client.RoomName + '<br/>' +
                      getTextResource('UserPhone') + ': ' + client.Phone + '<br/>' + getTextResource('UserFax') + ': ' + client.Fax;
            }
            //
            self.ClientObj = ko.observable(null);
            self.options = null;
            self.EditSelectedCllient = function (UserInfo) {
                var k = UserInfo;
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.SelectedClient().ID,
                        fieldName: 'Client',
                        Name: UserInfo.Name(),
                        Patronymic:UserInfo.Patronymic(),
                        Family: UserInfo.Family(),
                        Phone: UserInfo.Phone(), 
                        InPhone: UserInfo.PhoneInternal(),
                        SecondPhone: UserInfo.Fax(),
                        ClientPosition: UserInfo.PositionName(),
                        Subdivision: UserInfo.SubdivisionFullName(),
                        SubdivisionName: UserInfo.SubdivisionName(),
                        SubdivisionID: UserInfo.SubdivisionID(),
                        FullUserRoomInfo: UserInfo.FullUserRoomInfo(),
                        Organization: UserInfo.OrganizationName(),
                        RoomName: UserInfo.RoomName(),
                        Email: UserInfo.Email(),
                        RoomID: null,
                        WorkplaceName: UserInfo.WorkplaceName(),
                        WorkplaceID: null,
                        placeholderName: getTextResource('ParameterMustBeSet'),
                        fieldFriendlyName: getTextResource('Select'),
                    };
                    fh.ShowClientInfoEditorForm(options,self.ClientObj());
                });
            };
            self.InitSearcher = function () {
                var setUser = function (user) {
                    self.SearchFinished(false);
                    if (user) {
                        self.SelectedClient(user);
                        self.Phrase(user.FullName);
                        //
                        self.options = {
                            UserID: self.SelectedClient() ? self.SelectedClient().ID : '',
                            UserType: userLib.UserTypes.client,
                            UserName: self.SelectedClient() ? self.SelectedClient().FullName : '',
                            EditAction: self.EditSelectedCllient,
                            RemoveAction: null
                        };
                        self.ClientObj(new userLib.User(self, self.options));
                    }
                    else {
                        self.SelectedClient(null);
                        self.Phrase('');
                    }
                    self.FindResults();
                }
                var fh = new fhModule.formHelper();
                var ctrlD = fh.SetTextSearcherToField(
                    $('#' + self.MainRegionID).find('.callClientSearchForm__searcher .text-input'),
                    'WebUserSearcher',
                    'SearchControl/SearchTextFieldUserSearchControl',//template
                    null,//searcher params
                    function (objectInfo) {//select
                        setUser(null);
                        var param = { userID: objectInfo.ID };
                        self.ajaxControl.Ajax(
                            $('#' + self.MainRegionID),
                           {
                               dataType: "json",
                               method: 'GET',
                               url: 'userApi/GetUserInfo?' + $.param(param)
                           },
                           function (user) {
                               setUser(user);
                           });
                    },
                    function () {//reset
                        setUser(null);
                    },
                    null);
                $.when(ctrlD).done(function (ctrl) {
                    self.searcherModelD.resolve(ctrl);
                });
                //
                return ctrlD;
            };
            self.CallRegistrationClick = function () {
                showSpinner();
                require(['registrationForms'], function (rfhModule) {
                    var fh = new rfhModule.formHelper(true);
                    fh.ShowCallRegistrationEngineer(self.SelectedClient());
                });
            }
            self.Load = function () {
                self.formID = ko.getNewID();
                $.when(self.isLoaded).done(self.InitSearcher);
            };
            self.AfterRender = function () {
                self.isLoaded.resolve();
            };
            self.OnEnter = function (d, e) {
                if (e.keyCode === 13) {
                    if (self.SelectedClient() != null) {
                        self.FindResults();
                    }
                }
                return true;
            };
            
            self.GetCallClientID = function () {
                return self.SelectedClient() ? self.SelectedClient().ID : null;
            }

            $(document).bind('objectInserted', function (e, objectClassID, objectID) {
                if (objectClassID != 701)
                    return;
            });

           
            self.FindResults = function () {
                if (self.SelectedClient() == null) {
                    self.ClientObj(null);
                    var tmp = {
                        IsExpanded: ko.observable(false)
                    };
                    self.callList(tmp);
                    self.assetList(tmp);
                    return;
                }
                //
                self.$region = $('#' + self.MainRegionID);
                //
                var CallListS = new ClientSearchCallList.LinkList(self);
                CallListS.SetuserIDSearch(self.SelectedClient().ID);
                CallListS.SetUserSearchOption(self.options);
                //
                var AssetListS = new ClientSearchAssetList.LinkList(self); 
                AssetListS.SetuserIDSearch(self.SelectedClient().ID);
                //
                $.when(CallListS, AssetListS, operationIsGrantedD(79), operationIsGrantedD(23), operationIsGrantedD(77), operationIsGrantedD(65), operationIsGrantedD(518))
                    .done(function (s, a, view_module_AssetA, view_module_AssetB, view_module_AssetC, view_module_AssetD, view_module_Call) {
                        if (view_module_AssetA == true || view_module_AssetB == true || view_module_AssetC == true || view_module_AssetD == true )
                    {                       
                        self.assetList(AssetListS);
                    }
                    else {
                        var tmp = {
                            IsExpanded: ko.observable(false)
                        };
                        self.assetList(tmp);
                        }
                        if (view_module_Call == true) {
                            self.callList(CallListS);
                        }
                        else {
                            var tmp = {
                                IsExpanded: ko.observable(false)
                            };
                            self.callList(tmp);
                        }
                    //
                    $(".tableData").css('height', '100%');
                    if (self.assetList()!=null && self.callList()!=null) {
                        self.AssetListStyle = ko.computed(function () {
                            if (self.assetList().IsExpanded() && self.callList().IsExpanded()) {
                                self.callHeight('50%');
                                $(document).trigger('form_sizeChanged');
                            }
                            else if (!self.assetList().IsExpanded() && self.callList().IsExpanded()) {
                                $(".foundClientCalls").css('height', 'calc(100% - 30px)');
                                self.callHeight($(".foundClientCalls").height());
                                $(document).trigger('form_sizeChanged');
                            }
                            else if (!self.callList().IsExpanded()) {
                                self.callHeight('30px');
                                $(document).trigger('form_sizeChanged');

                            }
                        });
                        //
                        self.CallListStyle = ko.computed(function () {
                            if (self.assetList().IsExpanded() && self.callList().IsExpanded()) {
                                self.assetHeight('50%');
                                $(document).trigger('form_sizeChanged');
                            }
                            else if (!self.callList().IsExpanded() && self.assetList().IsExpanded()) {
                                $(".clientDependencies").css('height', 'calc(100% - 30px)');
                                self.assetHeight($(".clientDependencies").height());
                                $(document).trigger('form_sizeChanged');
                            }
                            else if (!self.assetList().IsExpanded()) {
                                self.assetHeight('30px');
                                $(document).trigger('form_sizeChanged');
                            }
                        });
                    }
                });
                //
                self.SearchFinished(true);
            }
        }
        }
        return module;
});