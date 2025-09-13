define(['knockout', 'jquery'], function (ko, $) {
    var module = {
        control: function (template) {
            template = template || 'SelectControl/SelectControl';
            var self = this;
            self.$region = null;
            self.$isLoaded = $.Deferred();
            self.$initializeCompleted = $.Deferred();
            self.divID = 'selectControl_' + ko.getNewID();
            //
            self.Template = template;
            //
            self.itemlist = ko.observableArray([]);
            self.selectedlist = ko.computed(function () {
                if (!self.itemlist || !self.itemlist() || self.itemlist().length == 0)
                    return [];
                //
                var retval = [];
                self.itemlist().forEach(function (el) {
                    if (el && el.Checked())
                        retval.push(el);
                });
                //
                return retval;
            });
            //config
            self.Title = ko.observable('');
            self.TitleStyle = ko.observable('');
            self.IsMultiple = ko.observable(true);
            self.ShowSearchFrom = ko.observable(11);
            self.AlwaysShowSearch = ko.observable(false); 
            self.SearchPlaceholder = ko.observable('');
            self.AlwaysShowTitle = ko.observable(false);
            self.ShowSingleSelectionInRow = ko.observable(false);
            self.FilterNameArray = ko.observable([]);
            self.AllowDeselect = ko.observable(true);
            self.DisplaySelectionAsSearchText = ko.observable(false);
            self.OnSelectAction = null;
            self.OnEditCompleteAction = null;
            self.IsEditSelectedAvailavible = ko.observable(true);
            //
            self.NeedShowTitle = ko.computed(function () {
                if (self.AlwaysShowTitle())
                    return true;
                //
                if (self.ShowSingleSelectionInRow())
                    return true;
                //
                return false;
            });
            //
            self.NeedShowSearch = ko.computed(function () {
                if (self.AlwaysShowSearch())
                    return true;
                //
                if (self.itemlist && self.itemlist().length >= self.ShowSearchFrom())
                    return true;
                //
                return false;
            });
            self.EditActive = ko.observable(false);
            self.EditActive.subscribe(function (settedValue) {
                if (settedValue === false && self.OnEditCompleteAction)
                    self.OnEditCompleteAction();
            });
            //
            self.SearchText = ko.observable('');
            //
            var regexEscapePattern = /[.*+?|()\[\]{}\\$^]/g; // .*+?|()[]{}\$^
            var regexEscape = function (str) {
                return str.replace(regexEscapePattern, "\\$&");
            };
            self.itemListForShow = ko.computed(function () {
                var stext = self.SearchText();
                if (!stext || self.DisplaySelectionAsSearchText && self.SelectionText() == stext) {
                    return self.itemlist();
                }
                //
                stext = stext.toLowerCase();
                //
                return ko.utils.arrayFilter(self.itemlist(), function (item) {
                    return item.Name().toLowerCase().indexOf(stext) != -1;
                });
            });
            self.IsListForShowEmpty = ko.computed(function () {
                var list = self.itemListForShow();
                if (!list || list.length == 0)
                    return true;
                //
                return false;
            });
            self.TitleForShow = ko.computed(function () {
                if (self.IsMultiple() || self.NeedShowTitle() || self.selectedlist().length == 0)
                    return self.Title();
                //
                var selected = self.selectedlist()[0].Name();
                var notAllowed = ko.utils.arrayFirst(self.FilterNameArray(), function (name) {
                    return selected == name;
                });
                if (notAllowed)
                    return self.Title();
                else return selected;                
            });
            self.ShowChoosenList = ko.computed(function () {
                return (self.IsMultiple() || self.ShowSingleSelectionInRow()) && self.selectedlist().length > 0;
            });
            //
            self.SelectionText = ko.computed(function () {
                if (!self.IsMultiple() && self.selectedlist().length == 1) {
                    return self.selectedlist()[0].Name();
                };
                return '';
            });
            //
            self.StartEditClick = function (obj, e) {
                self.EditActive(true);
                self.SearchText(self.DisplaySelectionAsSearchText() ?  self.SelectionText() : '');
                openRegion(self.$region.find('.selectControl-body'), e, function () { self.EditActive(false); });
            };
            //
            self.CancelEdit = function () {
                //closeRegions();
                //self.EditActive(false);
            }
            //
            self.SelectItemClick = function (item, e) {
                if (!item)
                    return;
                //
                var isClickFromInput = e.target.tagName.toLowerCase() == 'input';
                //
                if (!isClickFromInput)
                    if (!item.Checked() || self.AllowDeselect())
                        item.Checked(!item.Checked());
                //
                if (self.IsMultiple() == false) {
                    ko.utils.arrayForEach(self.itemlist(), function (el) {
                        if (el && el.ID != item.ID)
                            el.Checked(false);
                    });
                    //
                    closeRegions();
                    if (self.OnSelectAction)
                        self.OnSelectAction(ko.toJS(item));
                }
                else if (item.Checked()) {
                    if (self.OnSelectAction)
                        self.OnSelectAction(self.GetSelectedItems());
                }
                //
                return true;
            };
            self.DeselectItem = function (item) {
                if (!item)
                    return;
                //
                item.Checked(false);
                //
                if (self.ShowSingleSelectionInRow())
                    if (self.OnSelectAction)
                        self.OnSelectAction(self.GetSelectedItems());
                //
                if (self.OnEditCompleteAction)
                    self.OnEditCompleteAction();
            };
            //
            self.SetItemSelectedByID = function (itemID) {
                var retval = false;
                if (itemID !== null)
                    ko.utils.arrayForEach(self.itemlist(), function (el) {
                        if (el.ID == itemID && !el.Checked()) {
                            el.Checked(true);
                            retval = true;
                        }
                        else if (el.ID != itemID && !self.IsMultiple() && el.Checked())
                            el.Checked(false);
                    });
                //
                return retval;
            };
            self.GetSelectedItems = function () {
                if (self.IsMultiple())
                    return ko.toJS(self.selectedlist());
                else if (self.selectedlist().length > 0)
                    return ko.toJS(self.selectedlist()[0]);
                else return null;
            };
            //
            self.AddItemsToControl = function (newItems) {
                if (newItems) {
                    ko.utils.arrayForEach(newItems, function (el) {
                        if (el) {
                            var newItem = new module.item(el);
                            self.itemlist.push(newItem);
                        }
                    });
                }
            };
            self.ClearItemsList = function () {
                self.itemlist.removeAll();
            };
            self.DeselectAll = function () {
                if (!self.itemlist || !self.itemlist())
                    return;
                //
                self.itemlist().forEach(function (el) {
                    el.Checked(false);
                });
            };
            self.RenameItemByID = function (itemID, newName) {
                if (itemID === null || !newName)
                    return;
                //
                var itemToRename = ko.utils.arrayFirst(self.itemlist(), function (i) {
                    return i.ID == itemID;
                });
                //
                if (itemToRename)
                    itemToRename.Name(newName);
            };
            //
            self.defaultConfig = {
                Title: '', //заголовок
                TitleStyle: 'selectControl-defaultHeader', //стиль заголовка
                IsSelectMultiple: false, //появятся чекбоксы в поиске
                ShowSearchFrom: 11, //показывать поиск, если элементов больше чем 
                AlwaysShowSearch: false, //всегда иметь поиск?
                SearchPlaceholder: '',
                AlwaysShowTitle: false, //всегда показывать вместо выбранного элемента заголовок
                ShowSingleSelectionInRow: false, //при соло режиме показывать выбранный элемент как строчку (поглощает AlwaysShowTitle)
                FilterNameArray: [], //вместо этих названий будет заголовок
                AllowDeselect: true, //разрешать в соло режиме снимать выделенный элемент
                OnSelect: null, //функция коллбек при выбирании элемента
                OnEditComplete: null, //функция коллбек когда выбрано новое значение (в соло) или закончен выбор (в мультике). Не возвращает сами значения
                IsEditSelectedAvailavible: true, //можно ли менять значение выбранного предустановленного элемента
                DisplaySelectionAsSearchText: false //показывать выделение в строке поиска
            };
            self.init = function ($region, settings, getListDeferred) {
                self.$region = $region;
                var config = self.defaultConfig;
                $.extend(config, settings);
                //
                self.Title(config.Title);
                self.TitleStyle(config.TitleStyle);
                self.IsMultiple(config.IsSelectMultiple);
                self.ShowSearchFrom(config.ShowSearchFrom);
                self.AlwaysShowSearch(config.AlwaysShowSearch);
                self.SearchPlaceholder(config.SearchPlaceholder);
                self.AlwaysShowTitle(config.AlwaysShowTitle);
                self.ShowSingleSelectionInRow(config.ShowSingleSelectionInRow);
                self.FilterNameArray(config.FilterNameArray);
                self.AllowDeselect(config.AllowDeselect);
                self.DisplaySelectionAsSearchText(config.DisplaySelectionAsSearchText);
                self.OnSelectAction = config.OnSelect;
                self.OnEditCompleteAction = config.OnEditComplete;
                self.IsEditSelectedAvailavible = config.IsEditSelectedAvailavible;

                //
                self.$region.append('<div id="' + self.divID + '" style="position:relative" data-bind="template: {name: \'' + self.Template + '\', afterRender: AfterRender}" ></div>');
                //
                $.when(getListDeferred).done(function (listItems) {
                    if (listItems) {
                        ko.utils.arrayForEach(listItems, function (el) {
                            if (el) {
                                var newItem = new module.item(el);
                                self.itemlist.push(newItem);
                            }
                        });
                    }
                    //
                    try {
                        ko.applyBindings(self, document.getElementById(self.divID));
                        self.$initializeCompleted.resolve();
                    }
                    catch (err) {
                        if (document.getElementById(self.divID))
                            throw err;
                    }
                });
            };
            self.AfterRender = function () {
                self.$isLoaded.resolve();
            };
        },
        item: function (obj) {
            var self = this;
            //
            self.ID = obj.ID;
            self.ClassID = obj.ClassID;
            self.Name = ko.observable(obj.Name);
            self.Description = obj.Description;
            self.Checked = ko.observable(obj.Checked);
            self.Image = obj.Image;
        }
    }
    return module;
});