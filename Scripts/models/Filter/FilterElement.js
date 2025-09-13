define(['knockout', 'jquery', 'ajax', 'selectControl'], function (ko, $, ajaxLib, scLib) {
    var module = {
        ViewModel: function (filterMainModel, $container) {
            var self = this;
            self.filterMainModel = filterMainModel;
            self.$container = $container;
            //
            self.RenameAction = null;
            self.filterName = ko.observable('');
            self.filterName.subscribe(function (newValue) {
                if (self.RenameAction)
                    self.RenameAction(newValue);
            });
            self.MaxNameSize = 200;
            //
            self.types = {
                SimpleValue: 0,
                SliderValue: 1, //Not using
                SliderRange: 2,
                DatePick: 3,
                SelectorValue: 4, //Not using
                SelectorMultiple: 5,
                LikeValue: 6,
                FuncSelectorValue: 7 //Not using
            };
            //
            self.felList = ko.observableArray([]);//возможные условия
            self.editorCollection = ko.observableArray([]); //созданные редакторы
            //
            self.EditorAddCallback = function (htmlNodes, editor) {
                var node = ko.utils.arrayFirst(htmlNodes, function (html) {
                    return html.className == 'fElem-parameters-wrapper';
                });
                if (!node)
                    return;
                //
                var $container = $(node);
                var deferred = $.Deferred();
                editor.InititalizeList($container, deferred.promise());
                //
                var availableConditions = [];
                ko.utils.arrayForEach(self.felList(), function (fel) {
                    var existInEditors = ko.utils.arrayFirst(self.editorCollection(), function (ed) {
                        return ed.filterElementObject() != null && ed.filterElementObject().PropertyName == fel.PropertyName;
                    });
                    //
                    if (!existInEditors)
                        availableConditions.push({
                            ID: fel.PropertyName,
                            Name: fel.LocaleName,
                            Checked: false
                        });
                });
                //
                deferred.resolve(availableConditions);
            };
            self.ElementChanged = function (editor, newElementID) {
                if (!editor || !newElementID)
                    return;
                //
                var fElem = ko.utils.arrayFirst(self.felList(), function (f) {
                    return f.PropertyName == newElementID;
                });
                //
                if (!fElem)
                    return;
                var existInEditors = ko.utils.arrayFirst(self.editorCollection(), function (ed) {
                    return ed.filterElementObject() != null && ed.filterElementObject().PropertyName == fElem.PropertyName;
                });
                //
                if (!existInEditors) {
                    $.when(self.LoadElement(fElem.PropertyName)).done(function (fElemWithData) {
                        editor.InitializeByElement(fElemWithData);
                    });
                }
            };
            //
            self.CreateEditor = function () {
                var haveEmpty = ko.utils.arrayFirst(self.editorCollection(), function (ed) {
                    return ed.filterElementObject() == null;
                });
                //
                if (!haveEmpty) //no empty editors
                {
                    var editor = new module.FiltrationEditor(self);
                    self.editorCollection.push(editor);
                }
            };
            self.RemoveEditor = function (editor) {
                self.editorCollection.remove(editor);
            };
            //
            self.CreateEditorsFilterElements = function (existingElements) {
                if (!existingElements)
                    return;
                //
                ko.utils.arrayForEach(existingElements, function (elem) {
                    var editor = new module.FiltrationEditor(self);
                    self.editorCollection.push(editor);
                    $.when(self.LoadElement(elem.PropertyName), editor.$listLoaded).done(function (defaultElem) {
                        if (!editor.controlFilterElementsList || !ko.utils.arrayFirst(self.felList(), function (f) { return f.PropertyName == elem.PropertyName; }) && elem.PropertyName.indexOf('parameter_') == -1)
                            return;//нет контрола или нет описания столбца для фильтрации (кроме параметров)
                        //                        
                        if (editor.controlFilterElementsList.SetItemSelectedByID(elem.PropertyName) == false && elem.PropertyName.indexOf('parameter_') != -1) {//не удалось выбрать значение и этот элемент фильтра - параметр
                            editor.controlFilterElementsList.AddItemsToControl([{
                                ID: elem.PropertyName,
                                Name: elem.LocaleName,
                                Checked: false
                            }]);
                            editor.controlFilterElementsList.SetItemSelectedByID(elem.PropertyName);
                        }
                        $.when(editor.InitializeByElement(defaultElem)).done(function () {
                            self.PushValuesToEditor(editor, elem);
                        });
                    });
                });
            };
            self.Clear = function () {
                self.editorCollection.removeAll();
            };
            //
            self.PushValuesToEditor = function (editor, newRawElem) {
                if (!editor || !newRawElem)
                    return;
                //
                if (!editor.filterElementObject())
                    editor.InitializeByElement(newRawElem);
                else editor.filterElementObject().SetNewValues(newRawElem.raw);
            };
            self.GetValueFromEditors = function () {
                var retval = [];
                ko.utils.arrayForEach(self.editorCollection(), function (ed) {
                    if (!ed.filterElementObject())
                        return;
                    //
                    var resultElem = ed.filterElementObject().GetDataToSave();
                    //
                    if (resultElem)
                        retval.push(resultElem);
                });
                //
                return retval;
            };
            //
            self.ajaxControl_loadFullList = new ajaxLib.control();
            self.LoadFullList = function () {
                var returnD = $.Deferred();
                //
                self.felList.removeAll();
                //
                $.when(self.filterMainModel.currentTableView()).done(function (curViewInfo) {
                    self.filterMainModel.ShowSpinnerFilters();
                    var param = {
                        viewName: curViewInfo.view,
                        module: curViewInfo.module
                    };
                    //
                    self.ajaxControl_loadFullList.Ajax(null,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'filterApi/GetFilterElementsList?' + $.param(param)
                        },
                        function (listRawElements) {
                            if (listRawElements) {
                                listRawElements.forEach(function (el) {
                                    self.felList().push(new module.RawFilterElement(el));
                                });
                                //
                                self.felList.sort(function (left, right) {
                                    return left.LocaleName == right.LocaleName ? 0 : (left.LocaleName < right.LocaleName ? -1 : 1);
                                });
                            }
                            self.felList.valueHasMutated();
                            returnD.resolve();
                        },
                        function () {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[FilterElement.js, LoadFullList]', 'error')
                            });
                            returnD.resolve();
                        },
                        function () {
                            self.filterMainModel.HideSpinnerFilters();
                        });
                });
                //
                return returnD.promise();
            };
            //
            self.LoadElement = function (propertyName) {
                if (!propertyName)
                    return null;
                //
                var returnD = $.Deferred();
                $.when(self.filterMainModel.currentTableView()).done(function (curViewInfo) {
                    var param = {
                        viewName: curViewInfo.view,
                        module: curViewInfo.module,
                        propertyName: propertyName
                    };
                    //
                    var ajx = new ajaxLib.control();
                    ajx.Ajax(null,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'filterApi/GetFilterElement?' + $.param(param)
                        },
                        function (rawInfo) {
                            if (!rawInfo)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[FilterElement.js, LoadElement]', 'error')
                                });
                            //
                            returnD.resolve(new module.RawFilterElement(rawInfo));
                        },
                        function () {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[FilterElement.js, LoadElement]', 'error')
                            });
                            returnD.resolve();
                        });
                });
                //
                return returnD.promise();
            };
            self.ajaxControl_loadElementsByFilter = new ajaxLib.control();
            self.LoadElementsByFilter = function (filterID) {
                if (!filterID)
                    return null;
                //
                var returnD = $.Deferred();
                $.when(self.filterMainModel.currentTableView()).done(function (curViewInfo) {
                    var param = {
                        filterId: filterID,
                        module: curViewInfo.module
                    };
                    //
                    self.ajaxControl_loadElementsByFilter.Ajax($('.b-content-table__filter-container'),
                        {
                            url: 'filterApi/GetFilterElementsListByFilter?' + $.param(param),
                            method: 'GET'
                        },
                        function (filterListWithData) {
                            if (filterListWithData && filterListWithData.length > 0) {
                                var newData = [];
                                //
                                filterListWithData.forEach(function (el) {
                                    newData.push(new module.RawFilterElement(el));
                                });
                                //
                                self.CreateEditorsFilterElements(newData);
                            }                      
                        });
                });
                //
                return returnD.promise();
            };
            //
            self.HaveEditors = ko.computed(function () {
                if (!self.editorCollection() || self.editorCollection().length == 0)
                    return false;
                //
                var notEmpty = ko.utils.arrayFirst(self.editorCollection(), function (ed) {
                    return ed.filterElementObject() != null;
                });
                //
                if (notEmpty)
                    return true;
                //
                return false;
            });
            self.CanBeSaved = ko.computed(function () {
                if (!self.HaveEditors())
                    return false;
                //
                return true;
            });
        },
        RawFilterElement: function (obj) {
            var self = this;
            //
            self.Type = obj.Type;
            self.PropertyName = obj.PropertyName;
            self.LocaleName = obj.LocaleName;
            self.IsEmpty = obj.IsEmpty;
            //
            self.raw = obj;
        },
        FiltrationEditor: function (fElemLib) {
            var self = this;
            self.fElemLib = fElemLib;
            self.$listLoaded = $.Deferred();
            //
            self.filterElementObject = ko.observable(null);
            self.filterElementTemplate = ko.observable('');
            //
            self.controlFilterElementsList = null;
            self.InititalizeList = function ($region, promiseData) {
                $region.empty();
                self.controlFilterElementsList = new scLib.control();
                self.controlFilterElementsList.init($region,
                    {
                        Title: getTextResource('FilterChooseParameter'),
                        IsSelectMultiple: false,
                        AllowDeselect: false,
                        OnSelect: function (item) {
                            if (item)
                                self.fElemLib.ElementChanged(self, item.ID);
                        }
                    }, promiseData);
                //
                if (self.$listLoaded == null || self.$listLoaded.state() == 'resolved')
                    self.$listLoaded = $.Deferred();
                $.when(self.controlFilterElementsList.$initializeCompleted).done(function () {
                    self.$listLoaded.resolve();
                });
            };
            //
            self.InitializeByElement = function (rawElem) {
                if (!rawElem)
                    return;
                //
                self.filterElementObject(null);
                self.filterElementTemplate('');
                var retD = $.Deferred();
                //
                if (rawElem.Type == self.fElemLib.types.SliderRange) {
                    require(['models/Filter/FilterElements/RangeSlider'], function (modelLib) {
                        self.filterElementObject(new modelLib.ViewModel(rawElem.raw));
                        self.filterElementTemplate('Filter/FilterElements/RangeSlider');
                        $.when(self.filterElementObject().$isLoaded).done(function () {
                            retD.resolve();
                        });
                    });
                }
                else if (rawElem.Type == self.fElemLib.types.SelectorMultiple) {
                    require(['models/Filter/FilterElements/SelectorMultiple'], function (modelLib) {
                        self.filterElementObject(new modelLib.ViewModel(rawElem.raw));
                        self.filterElementTemplate('Filter/FilterElements/SelectorMultiple');
                        $.when(self.filterElementObject().$isLoaded).done(function () {
                            retD.resolve();
                        });
                    });
                }
                else if (rawElem.Type == self.fElemLib.types.DatePick) {
                    require(['models/Filter/FilterElements/DatePick'], function (modelLib) {
                        self.filterElementObject(new modelLib.ViewModel(rawElem.raw));
                        self.filterElementTemplate('Filter/FilterElements/DatePick');
                        $.when(self.filterElementObject().$isLoaded).done(function () {
                            retD.resolve();
                        });
                    });
                }
                else if (rawElem.Type == self.fElemLib.types.SimpleValue) {
                    require(['models/Filter/FilterElements/SimpleValue'], function (modelLib) {
                        self.filterElementObject(new modelLib.ViewModel(rawElem.raw));
                        self.filterElementTemplate('Filter/FilterElements/SimpleValue');
                        $.when(self.filterElementObject().$isLoaded).done(function () {
                            retD.resolve();
                        });
                    });
                }
                else if (rawElem.Type == self.fElemLib.types.LikeValue) {
                    require(['models/Filter/FilterElements/LikeValue'], function (modelLib) {
                        self.filterElementObject(new modelLib.ViewModel(rawElem.raw));
                        self.filterElementTemplate('Filter/FilterElements/LikeValue');
                        $.when(self.filterElementObject().$isLoaded).done(function () {
                            retD.resolve();
                        });
                    });
                }
                //
                return retD.promise();
            };
        }
    }
    return module;
});