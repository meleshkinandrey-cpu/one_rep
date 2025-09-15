define(['knockout', 'jquery', 'ajax', 'models/ServiceCatalogue/SearchPanels', 'jqueryMouseWheel'], function (ko, $, ajaxLib, spLib) {
    var module = {
        ServiceCategory: function (serviceCatalogue, obj) {
            var self = this;
            //
            self.ID = obj.ID;
            self.Name = obj.Name;
            self.Note = obj.Note;
            self.ImageSource = obj.ImageSource;
            //
            self.ShowDefaultImage = ko.computed(function () {
                return self.ImageSource == null || self.ImageSource == '' || self.ImageSource == undefined;
            });
            //
            self.ServiceList = ko.observableArray([]);
            if (obj.ServiceList)
                $.each(obj.ServiceList, function (index, service) {
                    var s = new module.Service(serviceCatalogue, self, service);
                    self.ServiceList().push(s);
                });
            //
            self.AvailableServiceList = ko.computed(function () {
                var retval = [];
                self.ServiceList().forEach(function (el) {
                    if (el.IsAvailable)
                        retval.push(el);
                });
                return retval;
            });
            self.VisibleServiceList = ko.computed(function () {
                return serviceCatalogue.FilterBySLA() == true ? self.AvailableServiceList() : self.ServiceList();
            });
        },

        Service: function (serviceCatalogue, serviceCategory, obj) {
            var self = this;
            //
            self.ID = obj.ID;
            self.Name = obj.Name;
            self.Note = obj.Note;
            self.IsNoteExpanded = ko.computed(function () {
                return serviceCatalogue.IsAllNotesExpanded();
            });
            self.IsNoteEmpty = self.Note == '' || self.Note == null || self.Note == undefined;
            self.NoteComputed = ko.computed(function () {
                if (self.IsNoteEmpty)
                    return getTextResource('SC_NoDescription');
                //
                return self.Note;
            });
            self.IsAvailable = obj.IsAvailable;
            self.ServiceCategory = serviceCategory;
            self.IsServiceItemListExpanded = ko.observable(true);
            self.IsServiceAttendanceListExpanded = ko.observable(true);
            self.IsExpanded = ko.observable(false);
            //
            self.ServiceItemAttendanceList = ko.observableArray([]);
            if (obj.ServiceItemAttendanceList)
                $.each(obj.ServiceItemAttendanceList, function (index, serviceItemAttendance) {
                    var sia = new module.ServiceItemAttendance(serviceCatalogue, self, serviceItemAttendance);
                    self.ServiceItemAttendanceList().push(sia);
                });
            //
            self.AvailableServiceItemAttendanceList = ko.computed(function () {
                var retval = [];
                self.ServiceItemAttendanceList().forEach(function (el) {
                    if (el.IsAvailable)
                        retval.push(el);
                });
                return retval;
            });
            self.VisibleServiceItemAttendanceList = ko.computed(function () {
                return serviceCatalogue.FilterBySLA() == true ? self.AvailableServiceItemAttendanceList() : self.ServiceItemAttendanceList();
            });
            self.VisibleServiceItemList = ko.computed(function () {
                var retval = [];
                self.ServiceItemAttendanceList().forEach(function (el) {
                    if (el.ClassID == 406/*OBJ_ServiceItem*/)
                        retval.push(el);
                });
                return retval;
            });
            self.VisibleServiceAttendanceList = ko.computed(function () {
                var retval = [];
                self.ServiceItemAttendanceList().forEach(function (el) {
                    if (el.ClassID == 407/*OBJ_ServiceAttendance*/)
                        retval.push(el);
                });
                return retval;
            });
        },

        ServiceItemAttendance: function (serviceCatalogue, service, obj) {
            var self = this;
            //
            self.ID = obj.ID;
            self.ClassID = obj.ClassID;
            self.Name = obj.Name;
            self.Note = obj.Note;
            self.IsNoteExpanded = ko.computed(function () {
                return serviceCatalogue.IsAllNotesExpanded();
            });
            self.IsNoteEmpty = self.Note == '' || self.Note == null || self.Note == undefined;
            self.NoteComputed = ko.computed(function () {
                if (self.IsNoteEmpty)
                    return getTextResource('SC_NoDescription');
                //
                return self.Note;
            });
            self.IsAvailable = obj.IsAvailable;
            self.IsInFavorite = ko.observable(obj.IsInFavorite);
            self.Parameter = obj.Parameter;
            self.Summary = obj.Summary;
            self.Service = service;
            //
            self.CallTypeInfoList = ko.computed(function () {
                if (!self.IsAvailable)
                    return [];
                else return self.ClassID == 406/*OBJ_ServiceItem*/ ?
                    serviceCatalogue.CallTypeForServiceItemList() :
                    serviceCatalogue.CallTypeForServiceAttendanceList();
            });
            //
            self.FullName = ko.computed(function () {
                return self.Service.ServiceCategory.Name + ' \\ ' + self.Service.Name + ' \\ ' + self.Name;
            });
        },

        CallTypeInfo: function (obj) {
            var self = this;
            //
            self.ID = obj.ID;
            self.Name = obj.Name;
            self.ImageSource = obj.ImageSource == null ? 'Images/fields/callType.png' : obj.ImageSource;
            self.IsServiceAttendance = obj.IsRFC == true ? true : false;
        },

        CallInfo: function (obj) {
            var self = this;
            //
            self.ID = obj.ID;
            self.Number = obj.Number;
            self.CallSummaryName = obj.CallSummaryName;
            self.ServiceItemAttendanceFullName = obj.ServiceItemAttendanceFullName;
            self.UtcDateRegistered = parseDate(obj.UtcDateRegistered);
            self.ImageSource = obj.ImageSource;
        },

        Modes: {
            none: 'none',
            serviceCatalogue: 'serviceCatalogue',//весь каталог сервисов
            serviceCatalogueBySLA: 'serviceCatalogueBySLA',//доступный пользователю каталог сервисов
            favorites: 'favorites',//избранное
            searchResults: 'searchResults'//результаты поиска
        },

        ServiceCatalogue: function () {
            var self = this;
            //
            self.$Region = null; //set in cshtml
            //
            self.SelectedServiceCategory = ko.observable(null);
            self.SelectedServiceCategory.subscribe(function (newValue) {
                if (!newValue ||
                    newValue && self.SelectedObject() && self.SelectedObject().Service && newValue != self.SelectedObject().Service.ServiceCategory ||
                    newValue && self.SelectedObject() && self.SelectedObject().ServiceCategory && newValue != self.SelectedObject().ServiceCategory)
                    self.SelectedObject(null);
            });
            //
            self.SelectedObject = ko.observable(null);//service or serviceItem or serviceAttendance
            self.SelectedObject.subscribe(function (newValue) {
                if (newValue && newValue.ServiceCategory)//service
                {
                    if (newValue.ServiceCategory != self.SelectedServiceCategory())
                        self.SelectedServiceCategory(newValue.ServiceCategory);
                }
                else if (newValue && newValue.Service)//serviceItemAttendance
                {
                    if (newValue.Service.ServiceCategory != self.SelectedServiceCategory())
                        self.SelectedServiceCategory(newValue.Service.ServiceCategory);
                    newValue.Service.IsExpanded(true);
                }
            });
            self.SelectedObjectTemplate = ko.computed(function () {
                var obj = self.SelectedObject();
                if (!obj)
                    return '';
                else if (obj.ServiceCategory)
                    return 'ServiceCatalogue/ServiceView';
                else if (obj.Service)
                    return 'ServiceCatalogue/ServiceItemAttendanceView';
            });
            //
            self.FilterBySLA = ko.observable(false);
            self.FilterBySLA.subscribe(function (newValue) {
                var selCategory = self.SelectedServiceCategory();
                var selObject = self.SelectedObject();
                var selService = selObject ? (selObject.ServiceCategory ? selObject : selObject.Service) : null;
                var selIA = selObject ? (selObject.Service ? selObject : null) : null;
                //
                if (newValue == true && selObject != null) {
                    var list = self.VisibleServiceCategoryList();
                    for (var i = 0; i < list.length; i++)
                        if (list[i] == selCategory)
                            for (var j = 0; j < selCategory.VisibleServiceList().length; j++)
                                if (selCategory.VisibleServiceList()[j] == selService)
                                    for (var k = 0; k < selService.VisibleServiceItemAttendanceList().length; k++)
                                        if (selService.VisibleServiceItemAttendanceList()[k] == selIA)
                                            return;
                    //
                    self.SelectedServiceCategory(null);
                    self.SelectedObject(null);
                }
            });
            //
            self.ServiceCategoryList = ko.observableArray([]);
            self.ServiceCategoryList.subscribe(function (changes) {
                self.UpdateScrollButtonsVisibility();//показываем или скрываем кнопки скролла
            });
            self.VisibleServiceCategoryList = ko.computed(function () {
                var retval = [];
                self.ServiceCategoryList().forEach(function (el) {
                    if (el.VisibleServiceList().length > 0)
                        retval.push(el);
                });
                //
                if (self.UpdateScrollButtonsVisibility)
                    self.UpdateScrollButtonsVisibility();//показываем или скрываем кнопки скролла
                //
                if (self.CategoryListVisible)
                    self.CategoryListVisible(retval.length !== 0);//если нет доступных категорий, то панель по умолчанию категорий скрыта
                //
                return retval;
            });
            //
            self.CallTypeInfoList = ko.observableArray([]);//список возможных типов заявок для регистрации клиентом
            self.CallTypeForServiceItemList = ko.computed(function () {
                var retval = [];
                self.CallTypeInfoList().forEach(function (el) {
                    if (el.IsServiceAttendance == false)
                        retval.push(el);
                });
                return retval;
            });
            self.CallTypeForServiceAttendanceList = ko.computed(function () {
                var retval = [];
                self.CallTypeInfoList().forEach(function (el) {
                    if (el.IsServiceAttendance == true)
                        retval.push(el);
                });
                return retval;
            });
            //
            self.FavoritesServiceItemAttendanceList = ko.computed(function () {//список избранных элементов/услуг
                var retval = [];
                //
                var categories = self.ServiceCategoryList();
                for (var i = 0; i < categories.length; i++) {
                    var services = categories[i].ServiceList();
                    for (var j = 0; j < services.length; j++) {
                        var sia = services[j].ServiceItemAttendanceList();
                        for (var k = 0; k < sia.length; k++)
                            if (sia[k].IsInFavorite() == true)
                                retval.push(sia[k]);
                    }
                }
                retval.sort(function (x, y) {
                    if (x.Name < y.Name)
                        return -1;
                    if (x.Name > y.Name)
                        return 1;
                    return 0;
                });
                return retval;
            });
            //
            self.CallInfoListLoaded = false;
            self.CallInfoList = ko.observableArray([]);//последние заявки, поданные текущим пользователем
            self.CutCallInfoList = ko.observable(true);//ограничивать количество
            self.CutCallInfoListClick = function () {
                self.CutCallInfoList(false);
            };
            self.VisibleCallInfoList = ko.computed(function () {
                if (self.CutCallInfoList() == false || self.CallInfoList().length == 0)
                    return self.CallInfoList();
                //
                var retval = [];
                //
                for (var i = 0; i < Math.min(10, self.CallInfoList().length) ; i++)
                    retval.push(self.CallInfoList()[i]);
                //
                return retval;
            });
            //            
            self.OnChangeFavoritesStateClick = function (serviceItemAttendance) {
                if (!serviceItemAttendance)
                    return;
                //
                var oldValue = serviceItemAttendance.IsInFavorite();
                serviceItemAttendance.IsInFavorite(!oldValue);
                //
                var param = {
                    objectID: serviceItemAttendance.ID,
                    objectClassID: serviceItemAttendance.ClassID,
                    value: serviceItemAttendance.IsInFavorite()
                };
                ajaxCtrl = new ajaxLib.control();
                ajaxCtrl.Ajax(self.$Region,
                    {
                        method: 'POST',
                        url: 'accountApi/SetCustomControl?' + $.param(param)
                    },
                    function (result) {
                        if (result != true) {
                            serviceItemAttendance.IsInFavorite(oldValue);//restore
                            //
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('GlobalError'), 'error');
                            });
                        }
                    });
            };
            //
            self.CanEdit = ko.observable(true);//for CallForm.Call.js
            self.CanShow = ko.observable(true);//for CallForm.Call.js
            self.IsClientMode = ko.observable(false);//for CallForm.Call.js
            self.IsReadOnly = ko.observable(false);//for CallForm.Call.js
            //
            self.LastCallLiteFullScreenCloser = undefined;
            self.SetterForCloser = function (closeAction) {
                self.LastCallLiteFullScreenCloser = closeAction;
            };
            //
            self.OnCallTypeClick = function (serviceItemAttendance, callTypeInfo) {
                showSpinner();
                var clientID = null;
                $.when(userD).done(function (user) {
                    clientID = user.UserID;
                });
                var callInfo =
                    {
                        ServiceID: serviceItemAttendance.Service.ID,
                        ServiceName: serviceItemAttendance.Service.Name,
                        ServiceCategoryName: serviceItemAttendance.Service.ServiceCategory.Name,
                        ServiceItemID: serviceItemAttendance.ClassID == 406/*OBJ_ServiceItem*/ ? serviceItemAttendance.ID : null,
                        ServiceItemName: serviceItemAttendance.ClassID == 406/*OBJ_ServiceItem*/ ? serviceItemAttendance.Name : null,
                        ServiceAttendanceID: serviceItemAttendance.ClassID == 407/*OBJ_ServiceAttendance*/ ? serviceItemAttendance.ID : null,
                        ServiceAttendanceName: serviceItemAttendance.ClassID == 407/*OBJ_ServiceAttendance*/ ? serviceItemAttendance.Name : null,
                        ServiceItemAttendanceFullName: this.ServiceCategoryName + ' \\ ' + this.ServiceName + ' \\ ' +
                        (this.ServiceItemID ? this.ServiceItemName : this.ServiceAttendanceName),
                        CallTypeID: callTypeInfo.ID,
                        ImageSource: callTypeInfo.ImageSource,
                        CallType: callTypeInfo.Name,
                        IsServiceAttendance: callTypeInfo.IsServiceAttendance,
                        ClientID: clientID
                    };
                require(['registrationForms', 'models/SDForms/CallForm.Call'], function (lib, callLib) {
                    var fh = new lib.formHelper(true);
                    var currentViewMode = self.SelectedViewMode();
                    self.SelectedViewMode(module.Modes.none);
                    $.when(fh.ShowCallRegistrationLiteFullScreen(null, null, null, new callLib.Call(self, callInfo), function () {
                        self.SelectedViewMode(currentViewMode);
                    })).done(self.SetterForCloser);
                });
            };
            self.OnCreateCallAsClick = function (callInfo) {
                var data = {
                    'ID': callInfo.ID,
                    'ClassID': 701/*obj_Call*/
                };
                var ajaxControl = new ajaxLib.control();
                ajaxControl.Ajax(self.$Region,
                {
                    dataType: "json",
                    method: 'POST',
                    data: data,
                    url: 'sdApi/GetObject'
                },
                function (newVal) {
                    var loadSuccessD = $.Deferred();
                    var processed = false;
                    //
                    if (newVal) {
                        if (newVal.Result.Result == 0) {//success
                            var objectInfo = newVal.Object;
                            if (objectInfo && objectInfo.ID) {
                                require(['registrationForms', 'models/SDForms/CallForm.Call'], function (lib, callLib) {
                                    var fh = new lib.formHelper(true);
                                    var _callInfo = objectInfo;
                                    _callInfo.ImageSource = callInfo.ImageSource;
                                    $.when(userD).done(function (user) {
                                        _callInfo.ClientID = user.UserID;
                                    });
                                    var currentViewMode = self.SelectedViewMode();
                                    self.SelectedViewMode(module.Modes.none);
                                    $.when(fh.ShowCallRegistrationLiteFullScreen(null, null, null, new callLib.Call(self, _callInfo), function () {
                                        self.SelectedViewMode(currentViewMode);
                                    })).done(self.SetterForCloser);
                                });
                            }
                        }
                    }
                });
            };
            //
            {//все по поиску
                self.SearchText = ko.observable('');
                self.SearchText.subscribe(function (newValue) {
                    if (newValue.length > 0)
                        self.WaitAndSearch(newValue);
                    else
                        self.FoundedServiceList([]);
                });
                self.SearchTextSplitted = ko.computed(function () {
                    var s = self.SearchText();
                    if (s)
                        return splitSearchString(s);
                    else return [];
                });
                //
                self.FoundedServiceList = ko.observableArray([]);
                //
                self.OnSearch = function () {
                    var text = self.SearchText();
                    if (text.length > 0)
                        self.Search();
                    else
                        require(['sweetAlert'], function () {
                            swal(getTextResource('SearchEmpty'), '', 'warning');
                        });
                };
                self.SearchKeyPressed = function (data, event) {
                    if (event.keyCode == 13)
                        self.OnSearch();
                    else
                        return true;
                };
                //
                self.searchTimeout = null;
                self.WaitAndSearch = function (text) {
                    clearTimeout(self.searchTimeout);
                    self.searchTimeout = setTimeout(function () {
                        if (text == self.SearchText())
                            self.Search();
                    }, 500);
                };
                //
                var regexEscapePattern = /[.*+?|()\[\]{}\\$^]/g; // .*+?|()[]{}\$^
                var regexEscape = function (str) {
                    return str.replace(regexEscapePattern, "\\$&");
                };
                //разрезает строку запроса на элементы
                var splitSearchString = function (text) {
                    var retval = [];
                    //начинаем с вырезания кавычечных
                    var firstPos = null;
                    while (text.indexOf('"') != -1) {
                        if (firstPos != null) {
                            var pos = text.indexOf('"', firstPos + 1);
                            if (pos != -1) {
                                var sub = text.substring(firstPos, pos + 1);//это будет строка в кавычках
                                text = text.replace(sub, "");
                                //
                                sub = sub.replace('"', " ").replace('"', " ").trim();//удаляем первую и последнюю кавычки и режем пробельцы
                                if (sub != "")
                                    retval.push(sub);
                                //
                                firstPos = null;
                            }
                            else break;
                        }
                        else firstPos = text.indexOf('"');
                    }
                    //
                    if (firstPos != null) //неправильная кавычка
                        text = text.replace('"', " ");
                    //
                    var splitted = text.split(" ");
                    ko.utils.arrayForEach(splitted, function (el) {
                        var s = el.trim();
                        if (s != "")
                            retval.push(s);
                    });
                    //
                    return retval;
                };
                //места сервиса для поиска
                var findedPlacesTypes = {
                    ServiceName: 'ServiceName',
                    ServiceNote: 'ServiceNote',
                    SIAName: 'SIAName',
                    SIANote: 'SIANote'
                };
                //получает из массива найденных мест поиска самое приоритетное
                var findedPlacesTypesGetTop = function (array) {
                    if (!array || array.length <= 0)
                        return null;
                    //
                    if (array.indexOf(findedPlacesTypes.ServiceName) != -1)
                        return findedPlacesTypes.ServiceName;
                    //
                    if (array.indexOf(findedPlacesTypes.SIAName) != -1)
                        return findedPlacesTypes.SIAName;
                    //
                    if (array.indexOf(findedPlacesTypes.ServiceNote) != -1)
                        return findedPlacesTypes.ServiceNote;
                    //
                    return findedPlacesTypes.SIANote;
                };
                //функция сравнения двух массивов мест поиска (используется для сортировки)
                var findedPlacesTypesComparer = function (xArr, yArr) {
                    if (!xArr || !yArr || xArr.length == 0 || yArr.length == 0)
                        return 0;
                    //
                    var x = findedPlacesTypesGetTop(xArr);
                    var y = findedPlacesTypesGetTop(yArr);
                    //
                    if (x == y)
                        return 0;
                    //
                    if (x == findedPlacesTypes.ServiceName && y != findedPlacesTypes.ServiceName)
                        return -1;
                    if (y == findedPlacesTypes.ServiceName && x != findedPlacesTypes.ServiceName)
                        return 1;
                    //
                    if (x == findedPlacesTypes.SIAName && y != findedPlacesTypes.SIAName)
                        return -1;
                    if (y == findedPlacesTypes.SIAName && x != findedPlacesTypes.SIAName)
                        return 1;
                    //
                    if (x == findedPlacesTypes.ServiceNote && y != findedPlacesTypes.ServiceNote)
                        return -1;
                    if (y == findedPlacesTypes.ServiceNote && x != findedPlacesTypes.ServiceNote)
                        return 1;
                    //
                    return 0;
                };
                //проверяет вхождение элементов массива в искомой строке
                var isContains = function (str, array) {
                    str = str ? str.toLowerCase() : '';
                    //
                    var unique = [];
                    var totalCounts = 0;
                    //
                    ko.utils.arrayForEach(array, function (el) {
                        el = el.toLowerCase();
                        if (str.indexOf(el) != -1)
                            unique.push(el);
                        else return;
                        //
                        var count = str.match(new RegExp(regexEscape(el), "g")).length;
                        totalCounts = totalCounts + count;
                    });
                    //
                    return {
                        Finded: unique.length > 0, //вошло ли
                        Unique: unique, //уникальные совпадения из искомого массива
                        Total: totalCounts //всего совпадений
                    };
                };
                //добавляет в первый массив то, что есть во втором (без повторов)
                var arrayCombine = function (targetArr, newValuesArr) {
                    if (newValuesArr.length <= 0)
                        return targetArr;
                    if (targetArr.length <= 0)
                        return newValuesArr;
                    //
                    ko.utils.arrayForEach(newValuesArr, function (el) {
                        if (targetArr.indexOf(el) == -1)
                            targetArr.push(el);
                    });
                    //
                    return targetArr;
                };
                //результаты поиска, прокомментированы в методе Search
                var searchResultItem = function (service, uniqueResults, totalResults, findedPlaces, findedAttendance, findedItems) {
                    var self = this;
                    self.Service = service;
                    self.Unique = uniqueResults.length;
                    self.Total = totalResults;
                    self.FindedPlaces = findedPlaces;
                    self.FindedAttendance = findedAttendance;
                    self.FindedItems = findedItems;
                    self.NeedFilrerSIA = (self.FindedPlaces.length > 0 && self.FindedPlaces.indexOf(findedPlacesTypes.ServiceName) == -1 && self.FindedPlaces.indexOf(findedPlacesTypes.ServiceNote) == -1);
                    self.NeedShow = function (id) { return (self.FindedAttendance.indexOf(id) != -1 || self.FindedItems.indexOf(id) != -1); }; //только для фильтрации по предыдущему пункту
                    //
                    self.NeedShowServiceNote = self.FindedPlaces.indexOf(findedPlacesTypes.ServiceNote) != -1;
                    self.NeedShowSIANote = function (id) { return (self.FindedPlaces.indexOf(findedPlacesTypes.SIANote) != -1) && self.NeedShow(id); };
                    self.NeedShowItemsBlock = ko.computed(function () {
                        return (self.NeedFilrerSIA == false && self.Service.VisibleServiceItemList().length > 0) || (self.NeedFilrerSIA == true && self.FindedItems.length > 0);
                    });
                    self.NeedShowAttendanceBlock = ko.computed(function () {
                        return (self.NeedFilrerSIA == false && self.Service.VisibleServiceAttendanceList().length > 0) || (self.NeedFilrerSIA == true && self.FindedAttendance.length > 0);
                    });
                };
                //
                self.Search = function () {
                    self.SelectedViewMode(module.Modes.searchResults);
                    self.CategoryListVisible(false);
                    var currentCategorySetting = self.SearchPanelCategory && self.SearchPanelCategory.CurrentSortCategoryID() != spLib.SortCategoryAllId ? self.SearchPanelCategory.CurrentSortCategoryID() : null;
                    //
                    //TODO по тегам не искать - требование ВН
                    var retval = [];
                    var searchArray = self.SearchTextSplitted();
                    //
                    var categories = self.ServiceCategoryList();
                    for (var i = 0; i < categories.length; i++) {
                        if (currentCategorySetting != null && currentCategorySetting != categories[i].ID)//сортировка по конкретной категории
                            continue;
                        //
                        var services = categories[i].ServiceList();
                        for (var j = 0; j < services.length; j++) {
                            var service = services[j];
                            var siaList = service.ServiceItemAttendanceList();
                            //
                            var uniqueResults = []; //уникальные совпадения по запросу
                            var totalResults = 0; //сколько всего в элементе совпадений
                            var findedPlaces = []; //где было найдено (перечисление findedPlacesTypes)
                            var findedItems = []; //ID в каких элементах нашли (возможно придется скрывать остальные) 
                            var findedAttendance = [];//ID в каких услугах нашли (возможно придется скрывать остальные)
                            //
                            var searchResult = isContains(service.Name, searchArray);
                            if (searchResult.Finded) {
                                uniqueResults = arrayCombine(uniqueResults, searchResult.Unique);
                                totalResults = totalResults + searchResult.Total;
                                findedPlaces.push(findedPlacesTypes.ServiceName);
                            }
                            //
                            searchResult = isContains(service.Note, searchArray);
                            if (searchResult.Finded) {
                                uniqueResults = arrayCombine(uniqueResults, searchResult.Unique);
                                totalResults = totalResults + searchResult.Total;
                                findedPlaces.push(findedPlacesTypes.ServiceNote);
                            }
                            //
                            for (var k = 0; k < siaList.length; k++) {
                                var sia = siaList[k];
                                var searchResult = isContains(sia.Name, searchArray);
                                if (searchResult.Finded) {
                                    uniqueResults = arrayCombine(uniqueResults, searchResult.Unique);
                                    totalResults = totalResults + searchResult.Total;
                                    if (findedPlaces.indexOf(findedPlacesTypes.SIAName) == -1)
                                        findedPlaces.push(findedPlacesTypes.SIAName);
                                    if (sia.ClassID == 406/*OBJ_ServiceItem*/ && findedItems.indexOf(sia.ID) == -1)
                                        findedItems.push(sia.ID);
                                    if (sia.ClassID == 407/*OBJ_ServiceAttendance*/ && findedAttendance.indexOf(sia.ID) == -1)
                                        findedAttendance.push(sia.ID);
                                }
                                //
                                searchResult = isContains(sia.Note, searchArray);
                                if (searchResult.Finded) {
                                    uniqueResults = arrayCombine(uniqueResults, searchResult.Unique);
                                    totalResults = totalResults + searchResult.Total;
                                    if (findedPlaces.indexOf(findedPlacesTypes.SIANote) == -1)
                                        findedPlaces.push(findedPlacesTypes.SIANote);
                                    if (sia.ClassID == 406/*OBJ_ServiceItem*/ && findedItems.indexOf(sia.ID) == -1)
                                        findedItems.push(sia.ID);
                                    if (sia.ClassID == 407/*OBJ_ServiceAttendance*/ && findedAttendance.indexOf(sia.ID) == -1)
                                        findedAttendance.push(sia.ID);
                                }
                            }
                            //
                            if (findedPlaces.length > 0)
                                retval.push(new searchResultItem(service, uniqueResults, totalResults, findedPlaces, findedAttendance, findedItems));
                        }
                    }
                    //
                    self.FoundedServiceList(retval);
                };
                //
                self.SearchPanelType = new spLib.SortTypesPanel(self);
                self.SearchPanelCategory = new spLib.SortCategoryPanel(self);
                //
                self.ShowedFoundedServiceList = ko.computed(function () {
                    var retval = self.FoundedServiceList();
                    //
                    if (!retval || retval.length == 0)
                        return retval;
                    //
                    var sortType = self.SearchPanelType.CurrentSortTypeID();
                    if (sortType) {
                        if (sortType == spLib.SortTypes.ascending)//А-Я
                            retval.sort(function (x, y) {
                                if (x.Service.Name < y.Service.Name)
                                    return -1;
                                if (x.Service.Name > y.Service.Name)
                                    return 1;
                                return 0;
                            });
                        //
                        if (sortType == spLib.SortTypes.descending)//Я-А
                            retval.sort(function (x, y) {
                                if (x.Service.Name < y.Service.Name)
                                    return 1;
                                if (x.Service.Name > y.Service.Name)
                                    return -1;
                                return 0;
                            });
                        //
                        if (sortType == spLib.SortTypes.relevance)//У кого уникальных вхождений выше, при равенстве - у кого вхождений выше
                            retval.sort(function (x, y) {
                                var result = findedPlacesTypesComparer(x.FindedPlaces, y.FindedPlaces);
                                if (result !== 0)
                                    return result;
                                //
                                if (x.Unique < y.Unique)
                                    return 1;
                                if (x.Unique > y.Unique)
                                    return -1;
                                //
                                if (x.Total < y.Total)
                                    return 1;
                                if (x.Total > y.Total)
                                    return -1;
                                //
                                return 0;
                            });
                    }
                    return retval;
                });
            }
            //
            {//контрол категорий
                self.ServiceCategoryControlHeight = ko.observable(0);
                //
                self.OnServiceCategoryClick = function (serviceCategory) {
                    self.CategoryListVisible(false);
                    self.SelectedServiceCategory(serviceCategory);
                };
                self.OnServiceCategoryScrollLeftClick = function (data, event) {
                    var $btn = $(event.target);
                    var $scrollContainer = $btn.parents('.sl_categoryList').find('.sl_categoryListBody');
                    //
                    if ($scrollContainer.length > 0) {
                        var oldvalue = $scrollContainer.scrollLeft();
                        if (oldvalue > 0) {
                            var newvalue = oldvalue - 400 >= 0 ? oldvalue - 400 : 0;
                            $scrollContainer.animate({ scrollLeft: newvalue }, 800);
                        }
                    }
                };
                self.OnServiceCategoryScrollRightClick = function (data, event) {
                    var $btn = $(event.target);
                    var $scrollContainer = $btn.parents('.sl_categoryList').find('.sl_categoryListBody');
                    //
                    if ($scrollContainer.length > 0) {
                        var oldvalue = $scrollContainer.scrollLeft();
                        if ((oldvalue + $scrollContainer.width()) < $scrollContainer[0].scrollWidth) {
                            var newvalue = oldvalue + 400;
                            $scrollContainer.animate({ scrollLeft: newvalue }, 800);
                        }
                    }
                };
                self.InitializeScrollServiceCategory = function ($region) { //для перехвата колесокрутилки над списком категорий
                    var $scrollcontainer = $region.find('.sl_categoryListBody');
                    $scrollcontainer.mousewheel(function (event, delta) {
                        this.scrollLeft -= (delta * 30);
                        event.preventDefault();
                    });
                };
                self.UpdateScrollButtonsVisibility = function () {
                    var $region = self.$Region.find('.sl_categoryListBody');
                    if ($region.length > 0) {
                        if ($region[0].scrollWidth > $region.width())
                            self.ScrollButtonsVisible(true);
                        else self.ScrollButtonsVisible(false);
                    }
                    else {
                        self.ScrollButtonsVisible(true);
                        setTimeout(self.UpdateScrollButtonsVisibility, 200);//try again later
                    };
                };
                //
                self.ScrollButtonsVisible = ko.observable(true);
                //
                self.ServiceCategoriesAfterRender = function () {
                    var $sc = self.$Region.find('.sc_serviceCategories');
                    self.InitializeScrollServiceCategory($sc);
                    //
                    self.UpdateScrollButtonsVisibility();//показываем или скрываем кнопки скролла
                    //
                    var height = self.$Region.find('.sl_categoryList').height();
                    var scMinHeight = parseInt($sc.css('min-height'));
                    scMinHeight = isNaN(scMinHeight) ? 0 : scMinHeight;
                    //
                    self.ServiceCategoryControlHeight(Math.max(height, scMinHeight));
                    //
                    if (!self.OpenedInModalForm) {
                        self.ResizeCategoryControl();
                        $(window).resize(self.ResizeCategoryControl);
                    }
                };
            }
            //
            {//контрол дерева сервисов
                self.CollapseExpandService = function (service) {
                    if (!service)
                        return;
                    //
                    service.IsExpanded(!service.IsExpanded());
                };
                self.OnServiceClick = function (service) {
                    if (!service)
                        return;
                    //
                    self.SelectedObject(service);
                    self.CollapseExpandService(service);
                };
                self.OnServiceItemAttendanceClick = function (serviceItemAttendance) {
                    if (!serviceItemAttendance)
                        return;
                    //
                    self.SelectedObject(serviceItemAttendance);
                    if (self.SelectedViewMode() != module.Modes.serviceCatalogue &&
                        self.SelectedViewMode() != module.Modes.serviceCatalogueBySLA)
                        self.SelectedViewMode(module.Modes.serviceCatalogue);
                };
            }
            //
            {//контрол представление сервиса
                self.IsAllNotesExpanded = ko.observable(true);
                //
                self.ServiceNoteToggle = function (service) {
                    self.IsAllNotesExpanded(!self.IsAllNotesExpanded());
                };
                self.ServiceItemAttendanceNoteToggle = function (serviceItemAttendance) {
                    self.IsAllNotesExpanded(!self.IsAllNotesExpanded());
                };
            }
            //
            {//контрол вкладок                
                self.ViewTemplateName = ko.observable('');//шаблон контента (справа) 
                self.SelectedViewMode = ko.observable(module.Modes.none);//выбранное представление по умолчанию
                self.SelectedViewMode.subscribe(function (newValue) {
                    if (newValue == module.Modes.serviceCatalogue || newValue == module.Modes.serviceCatalogueBySLA) {
                        self.ViewTemplateName('ServiceCatalogue/ServiceCatalogue');
                        self.FilterBySLA(newValue == module.Modes.serviceCatalogueBySLA);
                    }
                    else if (newValue == module.Modes.favorites) {
                        self.ViewTemplateName('ServiceCatalogue/Favorites');
                        self.FilterBySLA(false);
                    }
                    else if (newValue == module.Modes.searchResults) {
                        self.ViewTemplateName('ServiceCatalogue/SearchResults');
                        self.FilterBySLA(false);
                    }
                    else
                        self.ViewTemplateName('');
                });
                //
                self.AfterRenderMode = function () {
                    var ajaxControl = new ajaxLib.control();
                    ajaxControl.Ajax(self.$Region.find('.sc-views'),
                        {
                            url: 'configApi/IsNotAvailableServiceBySlaVisible',
                            method: 'GET'
                        },
                        function (visibleNotAvailableServices) {
                            if (visibleNotAvailableServices == true)
                                self.$Region.find('.fullcatalogueGroup').css('display', 'block');
                            else
                                self.$Region.find('.fullcatalogueGroup').css('display', 'none');
                        });
                };
                //
                self.ShowFavorites = function () {
                    if (self.LastCallLiteFullScreenCloser) {
                        self.LastCallLiteFullScreenCloser(true);
                        self.LastCallLiteFullScreenCloser = undefined;
                    }
                    //
                    self.SelectedViewMode(module.Modes.favorites);
                };
                self.IsFavoritesActive = ko.computed(function () {
                    return self.SelectedViewMode() == module.Modes.favorites;
                });
                self.FavoritesAfterRender = function () {
                    if (self.CallInfoListLoaded == false) {
                        self.CallInfoListLoaded = true;
                        //
                        self.LoadCallInfoList();
                    }
                };
                //
                self.ServiceListEmptyText = ko.computed(function () {
                    return self.SelectedViewMode() == module.Modes.serviceCatalogueBySLA ?
                           getTextResource('SC_NoUserSLA') :
                           getTextResource('SC_ServiceCatalogueEmpty');
                });
                //
                self.ShowFullCatalogue = function () {
                    if (self.LastCallLiteFullScreenCloser) {
                        self.LastCallLiteFullScreenCloser(true);
                        self.LastCallLiteFullScreenCloser = undefined;
                    }
                    //
                    self.SelectedViewMode(module.Modes.serviceCatalogue);
                    if (self.UpdateScrollButtonsVisibility)
                        self.UpdateScrollButtonsVisibility();//показываем или скрываем кнопки скролла
                    //
                    self.CategoryListVisible(self.SelectedServiceCategory() === null && self.SelectedObject() === null);
                };
                self.IsFullCatalogueActive = ko.computed(function () {
                    return self.SelectedViewMode() == module.Modes.serviceCatalogue;
                });
                //
                self.ShowSLACatalogue = function () {
                    if (self.LastCallLiteFullScreenCloser) {
                        self.LastCallLiteFullScreenCloser(true);
                        self.LastCallLiteFullScreenCloser = undefined;
                    }
                    //
                    self.SelectedViewMode(module.Modes.serviceCatalogueBySLA);
                    if (self.UpdateScrollButtonsVisibility)
                        self.UpdateScrollButtonsVisibility();//показываем или скрываем кнопки скролла
                    //
                    self.CategoryListVisible(self.SelectedServiceCategory() === null && self.SelectedObject() === null);
                };
                self.IsSLACatalogueActive = ko.computed(function () {
                    return self.SelectedViewMode() == module.Modes.serviceCatalogueBySLA;
                });
                //                
                self.ShowHelp = function () {
                    if (self.LastCallLiteFullScreenCloser) {
                        self.LastCallLiteFullScreenCloser(false);
                        self.LastCallLiteFullScreenCloser = undefined;
                    }
                    //
                    self.IsHelpActive(!self.IsHelpActive());
                };
                self.IsHelpActive = ko.observable(false);
                self.IsHelpActive.subscribe(function (newValue) {
                    if (newValue == true)
                        self.StopSOSTimer();
                });
                self.IsHelpVisible = ko.computed(function () {
                    return self.IsHelpActive();
                });
                //
                {//SOS
                    self.ShowHelpButton = ko.observable(true);
                    self.ShowHelpButton.subscribe(function (newValue) {
                        if (newValue == false)
                            self.StopSOSTimer();
                    });
                    //
                    self.SOSButtonClick = function () {
                        self.IsHelpActive(false);
                        //
                        showSpinner();
                        var clientID = null;
                        $.when(userD).done(function (user) {
                            clientID = user.UserID;
                        });
                        var callInfo =
                            {
                                CallTypeID: '00000000-0000-0000-0000-000000000000',//инцидент !rfs
                                IsServiceAttendance: false,
                                ClientID: clientID
                            };
                        require(['registrationForms', 'models/SDForms/CallForm.Call'], function (lib, callLib) {
                            var fh = new lib.formHelper(true);
                            var currentViewMode = self.SelectedViewMode();
                            self.SelectedViewMode(module.Modes.none);
                            $.when(fh.ShowCallRegistrationLiteFullScreen(null, null, null, new callLib.Call(self, callInfo), function () {
                                self.SelectedViewMode(currentViewMode);
                            })).done(self.SetterForCloser);
                        });
                    };
                    //
                    self.sosTimeout = null;
                    self.StartSOSTimer = function () {
                        self.sosTimeout = setTimeout(function () {
                            self.IsHelpActive(true);
                        }, 90 * 1000);
                    };
                    self.StopSOSTimer = function () {
                        clearTimeout(self.sosTimeout);
                        self.sosTimeout = null;
                    };
                }
            }
            //
            //
            //
            self.CurrentUserID = null;
            self.LoadServiceCategories = function () {
                var retval = $.Deferred();
                //
                var ajaxControl = new ajaxLib.control();
                ajaxControl.Ajax(self.$Region,
                    {
                        url: 'sdApi/GetServiceCategoriesWithServices',
                        data: { userID: self.CurrentUserID }
                    },
                    function (response) {
                        if (response) {
                            self.ServiceCategoryList.removeAll();
                            //
                            $.each(response, function (index, serviceCategory) {
                                var c = new module.ServiceCategory(self, serviceCategory);
                                self.ServiceCategoryList().push(c);
                            });
                            self.ServiceCategoryList.valueHasMutated();
                        }
                        retval.resolve();
                    });
                //
                return retval.promise();
            };
            self.LoadCallTypeInfoList = function () {
                var retval = $.Deferred();
                //
                var ajaxControl = new ajaxLib.control();
                ajaxControl.Ajax(null,
                    {
                        url: 'sdApi/GetCallTypeListForClient',
                        method: 'GET',
                    },
                    function (response) {
                        if (response) {
                            self.CallTypeInfoList.removeAll();
                            //
                            $.each(response, function (index, callTypeInfo) {
                                var cti = new module.CallTypeInfo(callTypeInfo);
                                self.CallTypeInfoList().push(cti);
                            });
                            self.CallTypeInfoList.valueHasMutated();
                        }
                        retval.resolve();
                    });
                //
                return retval;
            };
            self.LoadCallInfoList = function () {
                var retval = $.Deferred();
                //
                var ajaxControl = new ajaxLib.control();
                ajaxControl.Ajax(self.$Region.find('.sc_favoritesLast'),
                    {
                        url: 'sdApi/GetShortCallInfoList',
                        data: { userID: self.CurrentUserID }
                    },
                    function (response) {
                        if (response) {
                            self.CallInfoList.removeAll();
                            //
                            $.each(response, function (index, callInfo) {
                                var cti = new module.CallInfo(callInfo);
                                self.CallInfoList().push(cti);
                            });
                            self.CutCallInfoList(self.CallInfoList().length > 10);
                            self.CallInfoList.sort(function (x, y) {
                                if (x.Number < y.Number)
                                    return 1;
                                if (x.Number > y.Number)
                                    return -1;
                                return 0;
                            });
                            self.CallInfoList.valueHasMutated();
                        }
                        retval.resolve();
                    });
                //
                return retval;
            };
            //
            self.Load = function () {
                var retval = $.Deferred();
                //
                $.when(self.LoadServiceCategories()).done(function () {
                    var ajaxControl = new ajaxLib.control();
                    ajaxControl.Ajax(self.$Region.find('.sc-views'),
                        {
                            url: 'configApi/IsHardToChooseButtonVisibile',
                            method: 'GET'
                        },
                        function (isHardToChooseButtonVisibile) {
                            if (isHardToChooseButtonVisibile == false)
                                self.ShowHelpButton(false);
                            else
                                self.StartSOSTimer();
                        });
                    //
                    retval.resolve();
                });
                //
                return retval.promise();
            };
            //
            self.CategoryListVisible = ko.observable(true);
            //
            self.OnShowCategoryClick = function () {
                self.CategoryListVisible(!self.CategoryListVisible());
            };
            //
            self.SelectedItemPath = ko.computed(function () {
                var category = self.SelectedServiceCategory();
                //
                if (!category)
                    return '';
                //
                var retVal = '';
                retVal = category.Name;
                //
                var selectedObj = self.SelectedObject();
                //
                if (!selectedObj)
                    return retVal;
                //
                var classID = selectedObj.ClassID;
                if (classID == undefined)//service
                    retVal += ' > ' + selectedObj.Name;
                else if (classID == 406) {
                    var service = selectedObj.Service.Name;
                    var item = selectedObj.Name;
                    retVal += ' > ' + service + ' > ' + item;
                }
                else if (classID == 407) {
                    var service = selectedObj.Service.Name;
                    var attendance = selectedObj.Name;
                    retVal += ' > ' + service + ' > ' + attendance;
                }
                //
                return retVal;
            });
            //
            self.SmallCategories = ko.observable(false);
            //
            self.ResizeCategoryControl = function (event, width) {
                var $categoriesInnerContainer = $('.sc-categoriesInnerContainer');
                var $categoriesContainer = $('.sc-categoriesContainer');
                var $smallControl = $('.sc-categoriesContainer');
                //
                if ($categoriesInnerContainer.length > 1 && !self.OpenedInModalForm)
                    return;
                //
                if (!width) {
                    if ($categoriesInnerContainer.length > 1 && self.OpenedInModalForm)
                        return;
                    //
                    width = $(window).width();
                }
                //
                if (width >= 1680) {
                    var categoriesContainerWidth = 1598; //28 * 2 + 372 * 4 + 18 * 3 
                    $categoriesContainer.css('min-width', categoriesContainerWidth + 'px');
                    $categoriesContainer.css('max-width', categoriesContainerWidth + 'px');
                    //
                    var categoriesInnerContainerWidth = 1560; //9 * 2 + 372 * 4 + 18 * 3
                    $categoriesInnerContainer.css('min-width', categoriesInnerContainerWidth + 'px');
                    $categoriesInnerContainer.css('max-width', categoriesInnerContainerWidth + 'px');
                    self.SmallCategories(false);
                }
                else if (width >= 1360 && width < 1680) {
                    var categoriesContainerWidth = 1208; //28 * 2 + 372 * 3 + 18 * 2
                    $categoriesContainer.css('min-width', categoriesContainerWidth + 'px');
                    $categoriesContainer.css('max-width', categoriesContainerWidth + 'px');
                    //
                    var categoriesInnerContainerWidth = 1170; //9 * 2 + 372 * 3 + 18 * 2
                    $categoriesInnerContainer.css('min-width', categoriesInnerContainerWidth + 'px');
                    $categoriesInnerContainer.css('max-width', categoriesInnerContainerWidth + 'px');
                    self.SmallCategories(false);
                }
                else {
                    $smallControl.css('min-width', width - 130  + 'px');
                    $smallControl.css('max-width', width - 130 + 'px');
                    self.SmallCategories(true);
                }
            };
            //
            self.SetCategoryContorolTopLayer = function () {
                var $categoriesContainer = $('.sc-categoriesContainer');
                $categoriesContainer.css('z-index', 1);
                //
                var $hideDiv = $('.hide-categories-container-shadow');
                $hideDiv.css('z-index', 2);
            };
            //
            self.ResetCategoryControlLayer = function () {
                var $categoriesContainer = $('.sc-categoriesContainer');
                $categoriesContainer.css('z-index', 0);
                //
                var $hideDiv = $('.hide-categories-container-shadow');
                $hideDiv.css('z-index', 1);
            };
            //
            self.OpenedInModalForm = false;
            //
            self.ViewTemplateVisible = ko.computed(function () {
                return !self.CategoryListVisible() || self.SelectedViewMode() == module.Modes.favorites;
            });
        }
    }
    return module;
});
