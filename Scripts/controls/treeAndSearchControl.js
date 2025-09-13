define(['knockout', 'jquery', 'ajax', 'treeControl'], function (ko, $, ajaxLib, treeLib) {
    var module = {
        controlMulti: function() {
            var self = this;
            //
            self.modes = {
                searcher: 'searcher',
                tree: 'tree'
            };
            //
            self.$region = null;//set in init
            self.$isLoaded = $.Deferred();
            self.divID = 'treeAndSearchControl_' + ko.getNewID();
            self.Options = null;
            self.controlTree = null;
            self.controlSearch = null;
            self.SelectedValues = ko.observableArray([]);
            self.CurrentMode = ko.observable(self.modes.searcher);
            self.CurrentMode.subscribe(function (newValue) {
                if (newValue == self.modes.searcher) {
                    self.LoadValuesFromTree();
                    self.UpdateSearchValue();
                    self.controlSearch.searchPhrase('');
                }
                else if (newValue == self.modes.tree) {
                    self.LoadValuesFromSearch();
                    self.UpdateTreeValue();
                }
            });
            //
            self.ShowTree = ko.observable(true);
            //
            self.OnSelectionChanged = function () { };
            //
            self.AddIfNotExist = function (array, newTVD) {
                if (!newTVD || !array)
                    return;
                //
                if (array.length == 0)
                    array.push(newTVD);
                else
                {
                    var exist = ko.utils.arrayFirst(array, function (el) {
                        return el.ID == newTVD.ID;
                    });
                    //
                    if (!exist)
                        array.push(newTVD);
                }
            };
            //
            self.IsTreeVisible = ko.computed(function () {
                return self.ShowTree() && self.CurrentMode() == self.modes.tree;
            });
            self.SetTreeVisible = function () {
                if (self.CurrentMode() != self.modes.tree)
                    self.CurrentMode(self.modes.tree);
            };
            //
            self.IsSearcherVisible = ko.computed(function () {
                return self.CurrentMode() == self.modes.searcher;
            });
            self.SetSearcherVisible = function () {
                if (self.CurrentMode() != self.modes.searcher)
                    self.CurrentMode(self.modes.searcher);
            };
            //
            self.defaultConfig = {
                SelectedValues: [], // for this
                TargetClassID: [], // for this
                UseAccessIsGranted: false, // for tree
                TreeType: '', // for tree
                AvailableClassID: [], // for tree
                FinishClassID: [], // for tree
                OperationsID: [], // for tree
                ClassSearcher: '', // for searcher
                SearcherParams: [], // for searcher
                //
                ShowTree: true
            };
            //
            self.init = function ($region, settings) {
                self.$region = $region;
                var config = self.defaultConfig;
                $.extend(config, settings);
                //
                self.Options = config;
                ko.utils.arrayForEach(self.Options.SelectedValues, function (el) {
                    if (el)
                        self.SelectedValues.push(new module.treeValueData(el));
                });
                //
                if (self.Options.ShowTree === false)
                    self.ShowTree(false);
                //
                self.$region.append('<div id="' + self.divID + '" style="position:relative" data-bind="template: {name: \'SearchControl/TreeAndSearchControl\', afterRender: AfterRender}" ></div>');
                //
                try {
                    ko.applyBindings(self, document.getElementById(self.divID));
                }
                catch (err) {
                    if (document.getElementById(self.divID))
                        throw err;
                }
            };
            //
            self.InitializeTreeControl = function ($regionTree) {
                var retD = $.Deferred();
                //
                if (!self.ShowTree()) {
                    return retD.resolve();
                }
                //
                $regionTree.empty();
                self.controlTree = new treeLib.control();
                self.controlTree.init($regionTree, self.Options.TreeType, {
                    onClick: self.OnSelectionChanged,
                    ShowCheckboxes: true,
                    UseAccessIsGranted: self.Options.UseAccessIsGranted,
                    AvailableClassArray: self.Options.AvailableClassID,
                    ClickableClassArray: [],
                    AllClickable: false,
                    FinishClassArray: self.Options.FinishClassID,
                    OperationsID: self.Options.OperationsID,
                    DontLoadWhenInit: true
                });
                //
                $.when(self.controlTree.$isLoaded).done(function () {
                    if (self.CurrentMode == self.modes.tree)
                        $.when(self.UpdateTreeValue()).done(function () {
                            retD.resolve();
                        });
                    else retD.resolve();
                });
                //
                return retD.promise();
            };
            self.LoadValuesFromTree = function () {
                if (!self.controlTree)
                    return;
                //
                var currentValues = [];
                ko.utils.arrayForEach(self.controlTree.GetAllCheckedNodes(), function (node) {
                    if (self.Options.TargetClassID.indexOf(node.ClassID) !== -1)
                    currentValues.push(new module.treeValueData({
                        ID: node.ID,
                        Info: node.Name,
                        DopInfo: '',
                        ClassID: node.ClassID
                    }));
                });
                //
                if (self.SelectedValues().length == 0)
                    self.SelectedValues(currentValues);
                else
                {//удаляем старые значения, что могли быть выбраны в дереве
                    var newSelectedArray = currentValues;
                    ko.utils.arrayForEach(self.SelectedValues(), function (val) {
                        if (!self.Options.AvailableClassID || self.Options.AvailableClassID.length == 0)
                            return;
                        //
                        var couldBeSettedInTree = ko.utils.arrayFirst(self.Options.AvailableClassID, function (classID) {
                            return classID == val.ClassID;
                        });
                        if (!couldBeSettedInTree)
                            self.AddIfNotExist(newSelectedArray, val);
                    });
                    //
                    self.SelectedValues(newSelectedArray);
                }
            };
            self.UpdateTreeValue = function () {
                var retvalD = $.Deferred();
                var values = [];
                ko.utils.arrayForEach(self.SelectedValues(), function (val) {
                    if (!self.Options.AvailableClassID || self.Options.AvailableClassID.length == 0) {
                        values.push(val);
                        return;
                    }
                    //
                    var couldBeSettedInTree = ko.utils.arrayFirst(self.Options.AvailableClassID, function (classID) {
                        return classID == val.ClassID;
                    });
                    if (couldBeSettedInTree)
                        values.push(val);
                });
                //
                var process = function () {//recursive open by deferred
                    var item = values.pop();
                    if (item != undefined) {
                        var d = self.controlTree.OpenToNode(item.ID, item.ClassID);
                        $.when(d).done(function (node) {
                            if (node)
                                node.CheckedState(treeLib.checkedStates.Checked);
                            process();
                        });
                    }
                    else
                        retvalD.resolve();
                };
                //
                if (self.controlTree && values && values.length > 0) {
                    self.controlTree.UncheckAllNodes();
                    process();
                }
                else
                    retvalD.resolve();
                //
                return retvalD.promise();
            };
            //
            self.InitializeSearchControl = function ($regionSearch) {
                var retD = $.Deferred();
                //
                $regionSearch.empty();
                self.controlSearch = new module.controlSearch();
                self.controlSearch.init($regionSearch, {
                    ClassSearcher: self.Options.ClassSearcher,
                    SearcherParams: self.Options.SearcherParams
                });
                self.controlSearch.selectedList.subscribe(function (newValue) {
                    self.OnSelectionChanged();
                });
                //
                $.when(self.controlSearch.$isLoaded).done(function () {
                    if (self.CurrentMode == self.modes.searcher)
                        $.when(self.UpdateSearchValue()).done(function () {
                            retD.resolve();
                        });
                    else retD.resolve();
                });
                //
                return retD.promise();
            };
            self.LoadValuesFromSearch = function () {
                if (!self.controlSearch)
                    return;
                //
                var currentValues = self.controlSearch.GetSelectedList();
                //
                self.SelectedValues(currentValues);
            };
            self.UpdateSearchValue = function () {
                if (!self.controlSearch)
                    return;
                //
                var values = self.SelectedValues();
                //
                self.controlSearch.DeselectAll();
                self.controlSearch.SetSelectedList(values);
            };
            //
            self.GetValues = function () {
                if (self.IsTreeVisible())
                    self.LoadValuesFromTree();
                //
                if (self.IsSearcherVisible())
                    self.LoadValuesFromSearch();
                //
                var retval = ko.toJS(self.SelectedValues);
                //
                return retval;
            };
            self.SetValues = function (newArray) {
                ko.utils.arrayForEach(newArray, function (el) {
                    if (el)
                        self.AddIfNotExist(self.SelectedValues(), new module.treeValueData(el));
                });
                //
                if (self.IsTreeVisible())
                    self.UpdateTreeValue();
                //
                if (self.IsSearcherVisible())
                    self.UpdateSearchValue();
            };
            //
            self.OpenInNewWindow = function () {
                if (!self.controlTree)
                    return;
                //
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        TreeType: self.Options.TreeType,
                        ShowCheckboxes: true,
                        UseAccessIsGranted: self.Options.UseAccessIsGranted,
                        AvailableClassArray: self.Options.AvailableClassID,
                        ClickableClassArray: [],
                        AllClickable: false,
                        FinishClassArray: self.Options.FinishClassID,
                        OperationsID: self.Options.OperationsID,
                        DontLoadWhenInit: true
                    };
                    fh.ShowTreeControlAtWindow(options, self.controlTree.firstNodes(), null, null);
                });
            };
            //
            self.AfterRender = function () {
                var tPromise = self.InitializeTreeControl(self.$region.find('.treeAndSearchControl-tree'));
                var sPromise = self.InitializeSearchControl(self.$region.find('.treeAndSearchControl-search'));
                //
                $.when(tPromise, sPromise).done(function () {
                    self.$isLoaded.resolve();
                });
            };
        },
        controlSearch: function () {
            var self = this;
            self.ClassSearcher = ko.observable('');
            self.SearcherParams = ko.observableArray([]);
            self.$region = null;//set in init
            self.$isLoaded = $.Deferred();
            self.divID = 'searchControlForTree_' + ko.getNewID();
            //
            self.selectedList = ko.observableArray([]);
            self.findedList = ko.observableArray([]);
            self.nothingFound = ko.observable(false);
            self.searchPhrase = ko.observable(null);
            self.searchPhrase.subscribe(function (newValue) {
                if (newValue && newValue.length > 0)
                    self.InitSearch(newValue);
                else {
                    self.findedList.removeAll();
                    self.findedList.valueHasMutated();
                    self.nothingFound(false);
                }
            });
            self.IsSearchPhraseEmpty = ko.computed(function () {
                return self.searchPhrase() == null || self.searchPhrase() == undefined || self.searchPhrase() == '';
            });
            //
            self.ajaxControl = new ajaxLib.control();
            self.syncTimeout = null;
            self.syncD = null;
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
                    if (d == self.syncD && phrase == self.searchPhrase()) {
                        $.when(self.Search(phrase)).done(function () {
                            d.resolve();
                        });
                    }
                }, 500);
                //
                return d.promise();
            };
            self.Search = function (phrase) {
                self.ajaxControl.Ajax(self.$region,
                    {
                        url: 'searchApi/search',
                        method: 'POST',
                        data: {
                            Text: encodeURIComponent(phrase),
                            TypeName: self.ClassSearcher(),
                            Params: ko.toJSON(self.SearcherParams),//for post null params
                            CurrentUserID: null
                        }
                    },
                    function (response) {
                        if (response) {
                            self.findedList.removeAll();
                            response.forEach(function (el) {
                                self.findedList().push(new module.treeValueData(el));
                            });
                            if (self.findedList().length > 0) {
                                self.nothingFound(false);
                                self.findedList.valueHasMutated();
                            }
                            else self.nothingFound(true);
                        }
                    });
            };
            //
            self.defaultConfig = {
                ClassSearcher: '',
                SearcherParams: []
            };
            //
            self.init = function ($region, settings) {
                self.$region = $region;
                var config = self.defaultConfig;
                $.extend(config, settings);
                //
                self.ClassSearcher(config.ClassSearcher);
                self.SearcherParams(config.SearcherParams);
                //
                self.$region.append('<div id="' + self.divID + '" style="position:relative" data-bind="template: {name: \'SearchControl/SearchControlForTree\', afterRender: AfterRender}" ></div>');
                //
                try {
                    ko.applyBindings(self, document.getElementById(self.divID));
                }
                catch (err) {
                    if (document.getElementById(self.divID))
                        throw err;
                }
            };
            //
            self.AfterRender = function () {
                self.$isLoaded.resolve();
            };
            //
            self.IsSelected = function (item) {
                if (!item)
                    return false;
                //
                var exist = ko.utils.arrayFirst(self.selectedList(), function (el) {
                    return el.ID == item.ID;
                });
                //
                if (exist)
                    return true;
                //
                return false;
            };
            //
            self.SelectItemClick = function (obj) {
                if (!obj)
                    return;
                //
                var exist = ko.utils.arrayFirst(self.selectedList(), function (el) {
                    return el.ID == obj.ID;
                });
                //
                if (!exist)
                    self.selectedList().push(obj);
                else
                    self.selectedList.remove(function (el) {
                        return el.ID == obj.ID;
                    });
                //
                self.selectedList.valueHasMutated();
                //
                return true;
            };
            //
            self.GetSelectedList = function () {
                var retval = self.selectedList();
                //
                return retval;
            };
            //
            self.DeselectAll = function () {
                self.selectedList.removeAll();
                self.selectedList.valueHasMutated();
            };
            //
            self.SetSelectedList = function (newArray) {
                if (!newArray)
                    return;
                ko.utils.arrayForEach(newArray, function (el) {
                    var converted = new module.treeValueData(el);
                    //
                    if (converted.ID) {
                        var exist = ko.utils.arrayFirst(self.selectedList(), function (el) {
                            return el.ID == converted.ID;
                        });
                        //
                        if (!exist)
                            self.selectedList().push(converted);
                    }
                });
                //
                self.selectedList.valueHasMutated();
            };
        },
        treeValueData: function (data) {
            var self = this;
            //
            self.ID = data.ID;
            self.Name = data.Info ? data.Info : data.Name ? data.Name : data.FullName;
            self.DopInfo = data.DopInfo;
            self.ClassID = data.ClassID;
        }
    }
    return module;
});