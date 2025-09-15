define(['knockout', 'jquery', 'comboBox'], function (ko, $) {
    var module = {
        control: function ($region, clearAction, focusSearcher) {//к чему будем байндить; метод очистки поиска; сфокусировать text input
            var self = this;
            var $isLoaded = $.Deferred();
            self.$region = $region;
            self.SearchMode = {
                AllDB: 'AllDB',
                CurrentList: 'CurrentList',
                InFound: 'InFound'
            };
            //
            self.SelectedComboItem = ko.observable(null);
            //
            self.SelectedComboItem.subscribe(function (newValue) {
                var selectedItem = newValue.Identifier();
                if (selectedItem == self.SearchMode.AllDB)
                    self.SetAllDBMode();
                else if (selectedItem == self.SearchMode.CurrentList)
                    self.SetCurrentListMode();
                else if (selectedItem == self.SearchMode.InFound)
                    self.SetInFoundMode();
            });
            //
            self.comboItems = ko.observableArray([]);
            self.getComboItems = function () {
                return {
                    data: self.comboItems(),
                    totalCount: self.comboItems().length
                };
            };
            //
            self.InitComboItems = function () {
                var data = [];
                data.push(new ComboItem(getTextResource('SearchAllDB'), self.SearchMode.AllDB, true));
                if (self.params().hasOpenedContext())
                    data.push(new ComboItem(self.params().viewNameFriendly, self.SearchMode.CurrentList, true));
                data.push(new ComboItem(getTextResource('SearchInSearch'), self.SearchMode.InFound, false));
                //
                self.comboItems(data);
                self.comboItems.valueHasMutated();
                //
                self.SelectedComboItem(data[0]);
            };
            self.GetSearchInFoundComboItem = function () {
                return self.params().hasOpenedContext() ? self.comboItems()[2] : self.comboItems()[1];
            };
            //
            var ComboItem = function comboItem(name, idenfifier, isVisible) {
                var thisObj = this;
                thisObj.Name = ko.observable(name);
                thisObj.Identifier = ko.observable(idenfifier);
                thisObj.IsVisible = ko.observable(isVisible);
            };
            //
            //
            var Category = function (classID, name, icon, checked) {
                var thisObj = this;
                thisObj.ClassID = classID;
                thisObj.Name = ko.observable(name);
                thisObj.Selected = ko.observable(checked);
                thisObj.Icon = ko.observable(icon);
            };
            self.categories = ko.observableArray();
            self.categoriesSD = ko.observableArray();
            self.categoriesOther = ko.observableArray();
            self.InitCategories = function () {
                self.categories.push(new Category(701, getTextResource('Calls'), 'icon-extended-search__call', true));
                if (self.params().userHasRoles) {
                    self.categories.push(new Category(119, getTextResource('WorkOrders'), 'icon-extended-search__workorder', true));
                    self.categories.push(new Category(702, getTextResource('Problems'), 'icon-extended-search__problem', true));
                }
                self.categories().forEach(function (el) {
                    self.categoriesSD.push(el);
                });
                var kbaCategory = new Category(137, getTextResource('KBArticles'), 'icon-extended-search__kba', true);
                self.categories.push(kbaCategory);
                self.categoriesOther.push(kbaCategory);
            };
            self.GetKbaCategory = function () {
                return self.params().userHasRoles ? self.categories()[3] : self.categories()[1];
            }
            //
            var Params = function (hasOpenedContext, viewName, userHasRoles) {
                var thisObj = this;
                thisObj.hasOpenedContext = ko.observable(hasOpenedContext);
                thisObj.viewName = ko.observable(viewName);
                thisObj.viewNameFriendly = self.GetFriendlyViewName(viewName);
                thisObj.userHasRoles = userHasRoles;
                thisObj.searchInFinished = ko.observable(true);
            };
            self.params = ko.observable(null);
            //
            self.categoriesDivID = null;
            self.searchMode = ko.observable(null);
            //
            self.tagControl = null;
            self.firstSearch = true;//для InFound
            //
            self.SetAllDBMode = function (item) {
                self.searchMode(self.SearchMode.AllDB);
                self.UpdateCategoriesVisibility();
                return true;
            };
            self.SetCurrentListMode = function (item) {
                self.searchMode(self.SearchMode.CurrentList);
                self.UpdateCategoriesVisibility();
                return true;
            };
            self.SetInFoundMode = function (item) {
                self.searchMode(self.SearchMode.InFound);
                self.UpdateCategoriesVisibility();
                return true;
            };
            //
            self.CategoryCheckedChanged = function (item) {
                item.Selected(!(item.Selected()));
                //
                if (item.ClassID == 137) {
                    self.UpdateTagControlVisibility();
                }
                return true;
            };
            self.SearchInFinishedCheckedChanged = function (item) {
                self.params().searchInFinished(!(self.params().searchInFinished()));
                return true;
            };
            //
            self.ClearSearch = function (item) {
                clearAction();
                self.firstSearch = true;
                if (self.tagControl)
                    self.tagControl.Clear();
                self.UpdateSearchInFoundVisibility();
                //
                return true;
            };
            //
            self.GetClasses = function () {
                var searchMode = self.searchMode().toString();
                var classes = [];
                if (searchMode === self.SearchMode.CurrentList)
                    classes = null;
                else if (searchMode === self.SearchMode.AllDB || searchMode === self.SearchMode.InFound) {
                    self.categories().forEach(function (el) {
                        if (el.Selected())
                            classes.push(el['ClassID']);
                    });
                }
                return classes;
            };
            self.GetFriendlyViewName = function (viewName) {
                var retval = getTextResource('ForList') + ' "';
                if (viewName == 'CommonForTable')
                    retval += getTextResource('List_MyWorkplace');
                if (viewName == 'CallForTable')
                    retval += getTextResource('List_Calls');
                if (viewName == 'WorkOrderForTable')
                    retval += getTextResource('List_WorkOrders');
                if (viewName == 'ProblemForTable')
                    retval += getTextResource('List_Problems');
                if (viewName == 'ClientCallForTable')
                    retval += getTextResource('List_MyCalls');
                if (viewName == 'NegotiationForTable')
                    retval += getTextResource('ObjectsWithNegotiations');
                if (viewName == 'CustomControlForTable')
                    retval += getTextResource('CustomControl');
                return retval + '"';
            }
            //
            self.UpdateCategoriesVisibility = function () {
                var searchMode = self.searchMode().toString();
                var $categories = $('.extended-search-categories');
                if (self.params().hasOpenedContext()) {
                    if (searchMode === self.SearchMode.AllDB || searchMode === self.SearchMode.InFound)
                        $categories.css('display', 'block');
                    else if (searchMode === self.SearchMode.CurrentList)
                        $categories.css('display', 'none');
                }
                else
                    $categories.css('display', 'block');
                //
                self.UpdateTagControlVisibility();
                //
                if (focusSearcher)
                    focusSearcher();
            };
            self.UpdateTagControlVisibility = function () {
                var searchMode = self.searchMode().toString();
                var kbaCategory = self.GetKbaCategory(); 
                var $tagsControl = $('.tags_Control');
                //
                if(kbaCategory.Selected())
                {
                    if (self.params().hasOpenedContext()) {
                        if ((searchMode === self.SearchMode.AllDB || searchMode === self.SearchMode.InFound))
                            $tagsControl.css('display', 'block');
                        else
                            $tagsControl.css('display', 'none');
                    }
                    else
                        $tagsControl.css('display', 'block');
                }
                else
                    $tagsControl.css('display', 'none');
            };
            self.UpdateSearchInFoundVisibility = function () {
                var comboItem = self.GetSearchInFoundComboItem();
                comboItem.IsVisible(!self.firstSearch);
                if (self.firstSearch)
                    self.SelectedComboItem(self.comboItems()[0]);
            };
            //
            self.CreateTagsEditor = function () {                
                    require(['tagsControl'], function (lib) {
                        var _mainObj = $('#' + self.categoriesDivID).find('.extendedSearch');
                        self.tagControl = new lib.control(_mainObj);
                        $.when(self.tagControl.Load(self.categoriesDivID)).done(function () {
                            self.UpdateTagControlVisibility();
                            $isLoaded.resolve();
                        });
                    });
            };
            self.SetSearchMode = function () {
                self.searchMode(self.params().hasOpenedContext() ? self.SearchMode.CurrentList : self.SearchMode.AllDB);
            };
            self.BindControlToPanel = function () {
                var div = '<div id="' + self.categoriesDivID + '"class = "extended-search"  data-bind="template: {name: \'Search/SearchCategoryControl\', afterRender: AfterRender}"/>';
                self.$region.append(div);
                //
                var sElem = document.getElementById(self.categoriesDivID);
                try {
                    ko.applyBindings(self, sElem);
                }
                catch (err) {
                    if (sElem)
                        throw err;
                }
            };
            self.Init = function () {
                self.BindControlToPanel();
            };
            //
            self.Load = function (frm, mod) {
                self.categoriesDivID = "_categories";
                //
                $.when(userD).done(function (user) {
                    var hasOpenedContext = mod.OpenedModule === "SD" && user.ViewNameSD !== "RFCForTable";
                    var userViewName = hasOpenedContext ? user.ViewNameSD : "";
                    self.params(new Params(hasOpenedContext, userViewName, user.HasRoles));
                    //
                    self.Init();
                });
                //
                return $isLoaded.promise();
            };
            //
            self.AfterRender = function () {
                self.InitCategories();
                self.CreateTagsEditor();
                self.InitComboItems();
                self.SetSearchMode();
                //
                self.UpdateCategoriesVisibility();
                self.UpdateSearchInFoundVisibility();
            };
        }
    }
    return module;
});