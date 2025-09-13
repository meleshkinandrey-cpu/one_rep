define(['knockout', 'jquery', 'ajax', 'usualForms', 'ttControl', 'models/SDForms/SDForm.CallReferenceList', 'models/SDForms/SDForm.ProblemReferenceList', 'models/SDForms/SDForm.WOReferenceList', 'models/SDForms/SDForm.KBAReferenceList'], function (ko, $, ajaxLib, fhModule, tclib, callReferenceListLib, problemReferenceListLib, WOReferenceListLib, kbaReferenceList) {
    var module = {
        ViewModel: function ($region, openedModule, formCtrl) {
            var self = this;
            var $isLoaded = $.Deferred();
            self.$region = $region;
            self.formCtrl = formCtrl;//formControl
            self.searchResults = {
                nothingFound: 'nothingFound',
                allOK: 'allOK'
            };
            self.searchMode = {
                context: 0,
                user: 1
            };
            self.advancedSearchMode = {
                AllDB: 0,
                CurrentList: 1,
                InFound: 2
            };
            //
            self.searchResult = ko.observable(self.searchResults.allOK);
            //
            self.formID = (new Date()).toString();//уникальное значение для каждой открытой формы поиска
            //
            self.$searcher = function () {
                return self.$region.find('.searchForm__searcher.sd-search .text-input');
            };
            self.categoryControl = null;
            //
            self.SearcherText = ko.observable(null);
            self.SelectedClient = ko.observable(null);
            //
            self.CanShow = ko.observable(true);//используется в LinkList
            self.CanEdit = ko.observable(false);//используется в LinkList
            self.ReadOnly = ko.observable(false);
            //
            self.OpenedModule = openedModule;//модуль, из которого была вызвана форма (статистика, списки, база знаний, ...)
            //
            self.syncTimeout = null;
            self.syncD = null;
            self.searcher = null;
            //
            self.ajaxControl = new ajaxLib.control();
            //
            self.Load = function () {
                self.formID = (new Date()).getTime().toString();
                //
                $.when($isLoaded).done(self.InitSearcher);
                $.when(userD).done(function (user) { self.ReadOnly = ko.observable(!user.HasRoles); });
            };
            self.SearcherText.subscribe(function (newValue) {
                if (self.GetAdvancedMode() == self.advancedSearchMode.searchInSearch)
                    return;
                //
                self.InitSearch(newValue);
            });
            self.InitSearch = function (phrase) {
                var d = self.syncD;
                if (d == null || d.state() == 'resolved') {
                    d = $.Deferred();
                    self.syncD = d;
                }
                //
                if (self.syncTimeout)
                    clearTimeout(self.syncTimeout);
                self.syncTimeout = setTimeout(function () {
                    if (d == self.syncD && phrase == self.SearcherText()) {
                        if (self.SelectedClient() && self.SelectedClient().FullName != phrase)
                            self.SelectedClient(null);
                        //
                        $.when(self.Search(phrase)).done(function () {
                            d.resolve();
                        });
                    }
                }, 2000);
                //
                return d.promise();
            };
            self.InitSearcher = function () {
                var setUser = function (user) {
                    if (user) {
                        self.SelectedClient(user);
                        self.SearcherText(user.FullName);
                    }
                    else {
                        self.SelectedClient(null);
                        self.SearcherText(null);
                    }
                };
                var fh = new fhModule.formHelper();
                var ctrlD = fh.SetTextSearcherToField(
                    self.$searcher(),
                    'WebUserSearcher',
                    null,//default template
                    null,//searcher params
                    function (objectInfo) {//select
                        if (self.searcher.Items().length == 0)
                            return;
                        //
                        var param = { userID: objectInfo.ID };
                        self.ajaxControl.Ajax(self.$searcher(),
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
                    ctrl.LoadD.done(function () {
                        self.searcher = ctrl;
                        self.FocusSearcher();
                        ctrl.Close();
                        setTimeout(ctrl.Close, 500);
                    });
                });
                //
                return ctrlD;
            };
            self.OnEnter = function (d, e) {
                if (e.keyCode !== 13)
                    return true;
                //
                if (self.SelectedClient() && self.SelectedClient().FullName != self.SearcherText())
                    self.SelectedClient(null);
                //
                if (self.searcher)
                    self.searcher.Close();
                self.Search(self.SearcherText());
                return true;
            };
            self.ButtonSearchClick = function () {
                if (self.SelectedClient() && self.SelectedClient().FullName != self.SearcherText())
                    self.SelectedClient(null);
                //
                self.Search(self.SearcherText());
            };
            //
            self.OnScroll = function () {
                if (self.loadingOnClient)
                    return;
                var scrollPosition = 100 * this.scrollTop / (this.scrollHeight - this.clientHeight);
                if (scrollPosition > 80) {
                    var classID;
                    var visibleList;
                    //
                    if (self.kbaList() != null && self.kbaList().imList.List().length > 0) {
                        visibleList = self.kbaList().imList.List();
                        classID = 137;
                    }
                    else if (self.problemList() != null && self.problemList().imList.List().length > 0) {
                        visibleList = self.problemList().imList.List();
                        classID = 702;
                    }
                    else if (self.workorderList() != null && self.workorderList().imList.List().length > 0) {
                        visibleList = self.workorderList().imList.List();
                        classID = 119;
                    }
                    else if (self.callList().imList.List().length > 0) {
                        visibleList = self.callList().imList.List();
                        classID = 701;
                    }
                    //
                    var countBefore = visibleList.length;
                    var startIdx = countBefore;
                    //
                    $.when(self.LoadSearchResultOnClient(classID, startIdx)).done(function () {
                        if (visibleList == self.kbaList().imList.List() && visibleList.length == countBefore)
                            setTimeout(function () {//докрутили до конца списка, больше данных нет - не дадим ничего подгужать 10 сек
                            }, 10000);
                    });
                }
            }
            //
            self.loadingOnClient = false;
            //
            self.LoadSearchResultOnClient = function (classID, startIdx) {
                self.loadingOnClient = true;
                var retvalD = $.Deferred();
                var data = {
                    'formID': self.formID,
                    'advancedSearchMode': self.GetAdvancedMode(),
                    'viewName': self.categoryControl.params().viewName,
                    'loadOnClient': true,
                    'classes': self.categoryControl.GetClasses(),
                    'startIdx': startIdx,
                    'classID': classID,
                    'FindNotBound': false
                };
                self.ajaxControl.Ajax(null,
                    {
                        dataType: "json",
                        method: 'POST',
                        data: data,
                        url: 'sdApi/GetFoundObjects'
                    },
                    function (response) {
                        if (response) {
                            response.forEach(function (el) {
                                if (el.ClassID == 701) {
                                    $.when(self.callList().PushData(el.FoundObjectList)).done(function () {
                                        self.loadingOnClient = false;
                                    });
                                }
                                else if (el.ClassID == 137) {
                                    $.when(self.kbaList().PushData(el.FoundObjectList)).done(function () {
                                        self.loadingOnClient = false;
                                    });
                                }
                                else if (el.ClassID == 702) {
                                    $.when(self.problemList().PushData(el.FoundObjectList)).done(function () {
                                        self.loadingOnClient = false;
                                    });
                                }
                                else if (el.ClassID == 119) {
                                    $.when(self.workorderList().PushData(el.FoundObjectList)).done(function () {
                                        self.loadingOnClient = false;
                                    });
                                }
                            });
                        }
                        retvalD.resolve();
                    });
                return retvalD.promise();
            };
            //
            self.callList = ko.observable(null);
            self.problemList = ko.observable(null);
            self.workorderList = ko.observable(null);
            self.kbaList = ko.observable(null);
            //
            self.Search = function (phrase) {
                if (!self.categoryControl)
                    return;
                //
                self.loadingOnClient = false;
                //
                var returnD = $.Deferred();
                //
                var _callList = new callReferenceListLib.LinkList(null, null, null, self.ReadOnly, self.CanEdit);
                var _problemList = new problemReferenceListLib.LinkList(null, null, null, self.ReadOnly, self.CanEdit);
                var _workorderList = new WOReferenceListLib.LinkList(null, null, null, self.ReadOnly, self.CanEdit);
                var _kbaList = new kbaReferenceList.KBAReferenceList(null, null, null, self.ReadOnly, self.CanEdit);
                //
                self.problemList(_problemList);
                self.callList(_callList);
                self.workorderList(_workorderList);
                self.kbaList(_kbaList);
                //
                var data = {
                    'formID': self.formID,
                    'searchText': encodeURIComponent(self.SelectedClient() ? self.SelectedClient().ID : phrase),
                    'mode': self.GetMode(),
                    'classes': self.categoryControl.GetClasses(),
                    'tags': self.categoryControl.tagControl.GetTags(),
                    'advancedSearchMode': self.GetAdvancedMode(),
                    'searchFinished': self.GetAdvancedMode() != self.advancedSearchMode.CurrentList ? self.categoryControl.params().searchInFinished() : true,//если ищем в открытом списке, то флаг "показывать завершенные" определяется фильтрами списка
                    'viewName': self.categoryControl.params().viewName(),
                    'FindNotBound': false
                };
                self.ajaxControl.Ajax(self.$region.find('.foundObjects'),
                    {
                        dataType: "json",
                        method: 'POST',
                        data: data,
                        url: 'sdApi/GetFoundObjects'
                    },
                    function (response) {
                        if (response) {
                            if (response.length > 0) {
                                //
                                self.searchResult(self.searchResults.allOK);
                                //
                                response.forEach(function (el) {
                                    if (el.ClassID == 701) {
                                        _callList.PushData(el.FoundObjectList);
                                        self.callList(_callList);
                                    }
                                    else if (el.ClassID == 137) {
                                        _kbaList.PushData(el.FoundObjectList);
                                        self.kbaList(_kbaList);
                                    }
                                    else if (el.ClassID == 702) {
                                        _problemList.PushData(el.FoundObjectList);
                                        self.problemList(_problemList);
                                    }
                                    else if (el.ClassID == 119) {
                                        _workorderList.PushData(el.FoundObjectList);
                                        self.workorderList(_workorderList);
                                    }
                                });
                                self.categoryControl.firstSearch = false;
                                self.categoryControl.UpdateSearchInFoundVisibility();
                                self.AppendScroller();
                            }
                            else {
                                self.searchResult(self.searchResults.nothingFound);
                            }
                        }
                        else {
                            require(['sweetAlert'], function () {
                                swal('Error', getTextResource('Search_Error'), 'warning');
                            });
                        }
                        returnD.resolve();
                    });
                //
                return returnD.promise();
            };
            //
            self.GetAdvancedMode = function () {
                var searchMode = self.categoryControl.searchMode().toString();
                if (searchMode === 'AllDB')
                    return self.advancedSearchMode.AllDB;
                else if (searchMode === 'CurrentList')
                    return self.advancedSearchMode.CurrentList;
                else if (searchMode === 'InFound')
                    return self.advancedSearchMode.InFound;
            };
            self.GetMode = function () {
                var mode = null;
                if (self.SelectedClient() && self.SelectedClient().FullName == self.SearcherText().toString())
                    mode = self.searchMode.user;
                else
                    mode = self.searchMode.context;
                return mode;
            };
            //
            self.AppendScroller = function () {
                var $foundObjects = $('.foundObjects');
                $foundObjects.unbind('scroll', self.OnScroll);
                $foundObjects.bind('scroll', self.OnScroll);
            };
            //
            self.ClearSearch = function () {
                self.SearcherText(null);
                self.SelectedClient(null);
                self.callList(null);
                self.problemList(null);
                self.workorderList(null);
                self.kbaList(null);
                self.searchResult(self.searchResults.allOK);
            };
            //
            self.FocusSearcher = function () {
                self.$searcher().focus();
            };
            //
            self.AfterRenderExtendedSearchPanel = function () {
            };
            //
            self.AfterRender = function () {
                self.CreateLeftPanel();
                self.FocusSearcher();
            };
            self.categoryControlReady = ko.observable(false);
            //
            self.CreateLeftPanel = function () {
                require(['models/Search/searchCategoryControl'], function (categoryLib) {
                    self.categoryControl = new categoryLib.control($('#extendedSearchID'), self.ClearSearch, self.FocusSearcher);
                    var ctrlLoadedD = self.categoryControl.Load(null, self);
                    $.when(ctrlLoadedD).done(function () {
                        setTimeout(function () {
                            $isLoaded.resolve();
                            self.categoryControlReady(true);
                        }, 500)
                    });
                });

            };
        }
    }
    return module;
});