define(['knockout', 'jquery', 'ajax', 'usualForms', 'ttControl', 'models/SDForms/SDForm.CallReferenceList', 'models/SDForms/SDForm.ProblemReferenceList', 'models/SDForms/SDForm.WOReferenceList', 'models/SDForms/SDForm.KBAReferenceList', 'models/SDForms/SDForm.ProjectReferenceList'], function (ko, $, ajaxLib, fhModule, tclib, callReferenceListLib, problemReferenceListLib, WOReferenceListLib, kbaReferenceList, projectReferenceListLib) {
    var module = {
        ViewModel: function ($region, formCtrl, findClassIDs, objectClassID, ko_object, parentList) {
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
            self.formID = formCtrl.GetRegionID();//уникальное значение для каждой открытой формы поиска
            //
            self.$searcher = function () {
                return self.$region.find('.searchForm__searcher .text-input');
            };
            //
            self.SearcherText = ko.observable(null);
            //
            self.CanShow = ko.observable(true);//используется в LinkList
            self.CanEdit = ko.observable(true);//используется в LinkList
            self.ReadOnly = ko.observable(false);
            //
            self.SetClearButtonsList = null;
            self.SetFilledButtonsList = null;
            //
            self.syncTimeout = null;
            self.syncD = null;
            //
            self.ajaxControl = new ajaxLib.control();
            //
            self.Load = function () {
                self.formID = (new Date()).getTime().toString();
                //
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
                        $.when(self.Search(phrase)).done(function () {
                            d.resolve();
                        });
                    }
                }, 2000);
                //
                return d.promise();
            };
            self.OnEnter = function (d, e) {
                if (e.keyCode !== 13)
                    return true;
                //
                self.Search(self.SearcherText());
                return true;
            };
            //
            self.OnScroll = function (s, e) {
                if (self.loadingOnClient)
                    return;
                var $this = $(e.currentTarget)[0];
                var scrollPosition = 100 * $this.scrollTop / ($this.scrollHeight - $this.clientHeight);
                //
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
                    else if (self.callList() != null && self.callList().imList.List().length > 0) {
                        visibleList = self.callList().imList.List();
                        classID = 701;
                    }
                    else if (self.projectList() != null && self.projectList().imList.List().length > 0) {
                        visibleList = self.projectList().imList.List();
                        classID = 371;
                    }
                    //
                    var countBefore = visibleList.length;
                    var startIdx = countBefore;
                    //
                    $.when(self.LoadSearchResultOnClient(classID, startIdx)).done(function () {
                        if (visibleList.length == countBefore)
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
                    'viewName': '',
                    'loadOnClient': true,
                    'classes': findClassIDs,
                    'startIdx': startIdx,
                    'classID': classID,
                    'FindNotBound': true,
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
                                else if (el.ClassID == 371) {
                                    $.when(self.projectList().PushData(el.FoundObjectList)).done(function () {
                                        self.loadingOnClient = false;
                                    });
                                }
                            });
                        }
                        else
                            self.loadingOnClient = false;
                        retvalD.resolve();
                    });
                return retvalD.promise();
            };
            //
            self.callList = ko.observable(null);
            self.problemList = ko.observable(null);
            self.workorderList = ko.observable(null);
            self.kbaList = ko.observable(null);
            self.projectList = ko.observable(null);
            //
            self.SelectedItemNumber;//используется в имущественных операциях;
            //
            self.FormClose = function () {
                self.formCtrl.Close();
            };
            //
            self.Search = function (phrase) {
                showSpinner();
                //
                self.loadingOnClient = false;
                //
                var returnD = $.Deferred();
                //
                for (var i = 0; i < findClassIDs.length; i++) {
                    findClassID = findClassIDs[i];
                    if (findClassID === 701) {
                        var _callList = new callReferenceListLib.LinkList(ko_object, objectClassID, null, self.ReadOnly, self.CanEdit);
                        _callList.parentList = parentList;
                        _callList.SelectedItemNumber = self.SelectedItemNumber;
                        _callList.callback = self.callback;
                        _callList.closeFunk = self.FormClose;
                        _callList.SetClearButtonsList = self.SetClearButtonsList;
                        _callList.SetFilledButtonsList = self.SetFilledButtonsList;
                        //
                        if (self.callback)
                            _callList.imList.MultipleSelection = false;
                        //
                        self.callList(_callList);
                    }
                    else if (findClassID === 702) {
                        var _problemList = new problemReferenceListLib.LinkList(ko_object, objectClassID, null, self.ReadOnly, self.CanEdit);
                        _problemList.parentList = parentList;
                        _problemList.SelectedItemNumber = self.SelectedItemNumber;
                        _problemList.callback = self.callback;
                        _problemList.closeFunk = self.FormClose;
                        _problemList.SetClearButtonsList = self.SetClearButtonsList;
                        _problemList.SetFilledButtonsList = self.SetFilledButtonsList;
                        //
                        if (self.callback)
                            _problemList.imList.MultipleSelection = false;
                        //
                        self.problemList(_problemList);
                    }
                    else if (findClassID === 119) {
                        var _workorderList = new WOReferenceListLib.LinkList(ko_object, objectClassID, null, self.ReadOnly, self.CanEdit);
                        _workorderList.parentList = parentList;
                        _workorderList.SelectedItemNumber = self.SelectedItemNumber;
                        _workorderList.callback = self.callback;
                        _workorderList.closeFunk = self.FormClose;
                        _workorderList.SetClearButtonsList = self.SetClearButtonsList;
                        _workorderList.SetFilledButtonsList = self.SetFilledButtonsList;
                        //
                        if (self.callback)
                            _workorderList.imList.MultipleSelection = false;
                        //
                        self.workorderList(_workorderList);
                    }
                    else if (findClassID === 371) {
                        var _projectList = new projectReferenceListLib.LinkList(ko_object, objectClassID, null, self.ReadOnly, self.CanEdit);
                        _projectList.parentList = parentList;
                        _projectList.SelectedItemNumber = self.SelectedItemNumber;
                        _projectList.callback = self.callback;
                        _projectList.closeFunk = self.FormClose;
                        _projectList.SetClearButtonsList = self.SetClearButtonsList;
                        _projectList.SetFilledButtonsList = self.SetFilledButtonsList;
                        //
                        if (self.callback)
                            _projectList.imList.MultipleSelection = false;
                        //
                        self.projectList(_projectList);
                    }
                }
                //
                var data = {
                    'formID': self.formID,
                    'searchText': phrase && phrase.length != 0 ? encodeURIComponent(phrase) : ko_object != null ? encodeURIComponent(ko_object().ID()) : null,
                    'mode': self.GetMode(),
                    'classes': findClassIDs,
                    'tags': '',
                    'advancedSearchMode': self.GetAdvancedMode(),
                    'searchFinished': true,
                    'viewName': '',
                    'FindNotBound': true,
                };
                self.ajaxControl.Ajax(self.$region.find('.foundObjectsLite'),
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
                                    else if (el.ClassID == 371) {
                                        _projectList.PushData(el.FoundObjectList);
                                        self.projectList(_projectList);
                                    }
                                });
                                //self.AppendScroller();
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
                        hideSpinner();
                        //
                        returnD.resolve();
                        //self.AppendScroller();

                    });
                //
                return returnD.promise();
            };
            //
            self.GetAdvancedMode = function () {
                return self.advancedSearchMode.AllDB;
            };
            self.GetMode = function () {
                return self.searchMode.context;
            };
            //
            self.AppendScroller = function () {

            };
            //
            self.ClearSearch = function () {
                self.SearcherText(null);
                self.SelectedClient(null);
                self.callList(null);
                self.problemList(null);
                self.workorderList(null);
                self.kbaList(null);
                self.projectList(null);
                self.searchResult(self.searchResults.allOK);
            };
            //
            self.AfterRender = function () {
                self.$searcher().focus();
                self.Search('');
            };
        }
    }
    return module;
});