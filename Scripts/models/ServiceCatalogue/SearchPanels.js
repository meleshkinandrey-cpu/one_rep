define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        CreateListItem: function (id, name) {
            return { ID: id, Name: name }
        },
        SortTypes: {
            relevance: 'relevance',
            ascending: 'ascending',
            descending: 'descending'
        },
        SortTypesPanel: function (serviceCatalogue) {
            var self = this;
            //
            self.CurrentSortType = ko.observable(null);
            self.CurrentSortTypeName = ko.computed(function () {
                var cst = self.CurrentSortType();
                //
                if (cst && cst.Name)
                    return cst.Name;
            });
            self.CurrentSortTypeID = ko.computed(function () {
                var cst = self.CurrentSortType();
                //
                if (cst && cst.ID)
                    return cst.ID;
            });
            //
            self.IsShowed = ko.observable(false);
            self.HideShowClick = function () {
                self.IsShowed(!self.IsShowed());
            };
            //
            self.TypesArray = ko.observableArray([]);
            self.SelectType = function (stype) {
                var type = ko.utils.arrayFirst(self.TypesArray(), function (el) {
                    return el.ID == stype.ID;
                });
                //
                if (type)
                    self.CurrentSortType(type);
            };
            //
            var isInitialized = false;
            self.Initialize = function () {
                self.TypesArray.removeAll();
                //
                self.TypesArray.push(module.CreateListItem(module.SortTypes.relevance, getTextResource('SC_SearchRelevance')));
                self.TypesArray.push(module.CreateListItem(module.SortTypes.ascending, getTextResource('SC_SearchAscending')));
                self.TypesArray.push(module.CreateListItem(module.SortTypes.descending, getTextResource('SC_SearchDescending')));
                //
                if (!self.CurrentSortType())
                    self.CurrentSortType(self.TypesArray()[0]);//relevance
                //
                isInitialized = true;
            };
            self.AfterRender = function () {
                if (!isInitialized)
                    self.Initialize();
            };          
        },
        SortCategoryAllId: 'SortCategoryAll',
        SortCategoryPanel: function (serviceCatalogue, obj) {
            var self = this;
            //
            self.CurrentSortCategory = ko.observable(null);
            self.CurrentSortCategoryName = ko.computed(function () {
                var csc = self.CurrentSortCategory();
                //
                if (csc && csc.Name)
                    return csc.Name;
            });
            self.CurrentSortCategoryID = ko.computed(function () {
                var csc = self.CurrentSortCategory();
                //
                if (csc && csc.ID)
                    return csc.ID;
            });
            //
            self.IsShowed = ko.observable(false);
            self.HideShowClick = function () {
                self.IsShowed(!self.IsShowed());
            };
            //
            self.CategoryArray = ko.computed(function () {
                var retval = [];
                retval.push(module.CreateListItem(module.SortCategoryAllId, getTextResource('SC_SortAllCategory')));
                //
                var catList = serviceCatalogue.VisibleServiceCategoryList();
                if (catList)
                    ko.utils.arrayForEach(catList, function (el) {
                        if (el)
                            retval.push(module.CreateListItem(el.ID, el.Name));
                    });
                //
                return retval;
            });
            self.SelectCategory = function (scategory) {
                var category = ko.utils.arrayFirst(self.CategoryArray(), function (el) {
                    return el.ID == scategory.ID;
                });
                //
                if (category) {
                    self.CurrentSortCategory(category);
                    serviceCatalogue.OnSearch();
                }
            };
            self.SetDefaultCategory = function () {
                var defaultCategory = ko.utils.arrayFirst(self.CategoryArray(), function (el) {
                    return el.ID == module.SortCategoryAllId;
                });
                //
                self.CurrentSortCategory(defaultCategory);
            };
            //
            self.Initialize = function () {
                if (!self.CurrentSortCategory())
                    self.SetDefaultCategory();
                else
                {
                    var currentCategory = ko.utils.arrayFirst(self.CategoryArray(), function (el) {
                        return el.ID == self.CurrentSortCategoryID();
                    });
                    //
                    if (!currentCategory)
                        self.SetDefaultCategory();
                }
            };
            //
            self.AfterRender = function () {
                self.Initialize();
            };
        }
    }
    return module;
});