define(['jquery', 'knockout', 'formControl'], function ($, ko, fc) {
    var module = {
        formHelper: function (isSpinnerActive) {
            var self = this;
            //
            //Прокрутить скрол до элемента: объект jQuery, элемент jQuery/команда [top, bottom, some element]
            self.ScrollTo = function (obj, value) {
                if (obj.length == 0 || !value)
                    return;
                if (value === 'top')
                    obj.scrollTop(0);
                else if (value === 'bottom')
                    obj.scrollTop(obj[0].scrollHeight);
                else //some element
                {
                    if (value.length == 0)
                        return;
                    value[0].scrollIntoView();
                }
            };
            //
            //Искалка объекта по тексту
            //объект jQuery input, string название искалки, string название шаблона искалки, [] параметры конструктора для искалки, function(objectInfo) действие выбора найденного объекта, function() действие сброса значения, function() действие закрытия искалки, deferred ожидания выполнения загрузки, игнорировать очищение при пустом поле ввода
            self.SetTextSearcherToField = function (obj, searcherName, searcherTemplateName, searcherParams, selectAction, resetAction, closeAction, dLoad, clearOnEmptyIgnore) {
                var retval = $.Deferred();
                require(['objectSearcher'], function (lib) {
                    var ctrl = new lib.control(obj, searcherName, searcherTemplateName, searcherParams, selectAction, resetAction, closeAction, dLoad, clearOnEmptyIgnore === true ? true : false);
                    retval.resolve(ctrl);
                });
                return retval.promise();
            };
            //
            //Просмотр любого текста в отдельном окне
            //string заголовок формы, string сообщение textPlain
            self.ShowTextViewer = function (formCaption, text, isHTML) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {}
                var ctrl = undefined;
                buttons[getTextResource('Close')] = function () { ctrl.Close(); }
                //
                ctrl = new fc.control('textViewer', 'textViewer', formCaption, true, true, true, 350, 200, buttons, null, 'data-bind="template: {name: \'SDForms/TextViewer\'}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                ctrl.ExtendSize(600, 450);
                //
                require(['models/SDForms/TextViewer'], function (vm) {
                    var mod = new vm.ViewModel();
                    mod.SetText(text);
                    //
                    if (isHTML === true)
                        mod.isHTML(true);
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD).done(hideSpinner);
                });
            };
            //
            //Просморт каталога сервисов, выбор элемента, выбор услуги
            self.ServiceCatalogueBrowserMode = {
                Default: 0,//флаг, который ничего не делает
                ShowOnlyServiceItems: 1,//не показывать услуги
                ShowOnlyServiceAttendances: 2,//не показывать элементы
                FilterBySLA: 4,//использовать фильтрацию по сла
                ShowHardToChoose: 8//показывать сос, если доступна
            };
            //режим; ид пользователя, по которому смотреть сла для фильтрации; выделить сервис с идентификатором;
            self.ShowServiceCatalogueBrowser = function (mode, userID, selectedServiceID) {
                var showOnlyServiceItems = (mode & self.ServiceCatalogueBrowserMode.ShowOnlyServiceItems) == self.ServiceCatalogueBrowserMode.ShowOnlyServiceItems;
                var showOnlyServiceAttendances = (mode & self.ServiceCatalogueBrowserMode.ShowOnlyServiceAttendances) == self.ServiceCatalogueBrowserMode.ShowOnlyServiceAttendances;
                var filterBySLA = (mode & self.ServiceCatalogueBrowserMode.FilterBySLA) == self.ServiceCatalogueBrowserMode.FilterBySLA;
                var showHardToChoose = (mode & self.ServiceCatalogueBrowserMode.ShowHardToChoose) == self.ServiceCatalogueBrowserMode.ShowHardToChoose;
                //
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var retval = $.Deferred();
                var buttons = {}
                var ctrl = undefined;
                var selectedItemAttendance = undefined;
                var resizeCatetoryControl = null;
                var cancelForm = function () {
                    retval.resolve(selectedItemAttendance);
                    //
                    if (resizeCatetoryControl)
                        resizeCatetoryControl();
                };
                buttons[getTextResource('Close')] = function () {
                    ctrl.Close();
                    cancelForm();
                };
                //
                var caption = getTextResource('ServiceCatalogueBrowserCaption');
                if (showOnlyServiceItems == true)
                    caption = getTextResource('ServiceCatalogueBrowserSelectServiceItemCaption');
                else if (showOnlyServiceAttendances)
                    caption = getTextResource('ServiceCatalogueBrowserSelectServiceAttendanceCaption');
                //
                ctrl = new fc.control('serviceCatalogueBrowser', 'serviceCatalogueBrowser', caption, true, true, true, 700, 550, buttons, cancelForm, 'data-bind="template: {name: \'ServiceCatalogue/ServiceCatalogueBrowser\'}"');
                if (!ctrl.Initialized) {
                    cancelForm();
                    return;
                }
                //
                var ctrlD = ctrl.Show();
                ctrl.ExtendSize(1000, 800);
                //
                require(['models/ServiceCatalogue/ServiceCatalogue'], function (vm) {
                    var mod = new vm.ServiceCatalogue();
                    mod.CurrentUserID = userID;
                    mod.CallInfoListLoaded = true;//cancel load
                    mod.AfterRenderMode = function () {//override function
                        if (showHardToChoose == false)
                            mod.ShowHelpButton(false);
                        //
                        if (filterBySLA == false)
                            mod.$Region.find('.fullcatalogueGroup').css('display', 'block');
                        else
                            mod.$Region.find('.fullcatalogueGroup').css('display', 'none');
                    };
                    mod.SOSButtonClick = function () {//override select Затрудняюсь выбрать                        
                        selectedItemAttendance = null;
                        ctrl.Close();
                    };
                    var oldOnServiceItemAttendanceClick = mod.OnServiceItemAttendanceClick;
                    mod.OnServiceItemAttendanceClick = function (serviceItemAttendance) {//override
                        oldOnServiceItemAttendanceClick();
                        selectedItemAttendance = serviceItemAttendance;
                        ctrl.Close();
                    };
                    var rootElement = document.getElementById(ctrl.GetRegionID());
                    mod.$Region = $(rootElement);
                    //
                    mod.OpenedInModalForm = true;
                    //
                    resizeCatetoryControl = function () {
                        mod.ResizeCategoryControl();
                        mod.ResetCategoryControlLayer();
                    };
                    //
                    $.when(ctrlD, mod.Load()).done(function () {
                        var classIDToRemove = showOnlyServiceItems == true ? 407 : (showOnlyServiceAttendances == true ? 406 : 0);
                        var selectedService = null;
                        //
                        var categories = mod.ServiceCategoryList();
                        for (var i = 0; i < categories.length; i++) {
                            var services = categories[i].ServiceList();
                            for (var j = 0; j < services.length; j++) {
                                if (services[j].ID == selectedServiceID)
                                    selectedService = services[j];
                                //
                                var sia = services[j].ServiceItemAttendanceList();
                                var changed = false;
                                for (var k = 0; k < sia.length; k++)
                                    if (sia[k].ClassID == classIDToRemove ||
                                        sia[k].IsAvailable == false && filterBySLA == true) {
                                        sia.splice(k, 1);
                                        k--;
                                        changed = true;
                                    }
                                if (changed)
                                    services[j].ServiceItemAttendanceList.valueHasMutated();
                            }
                        }
                        if (selectedService != null)
                            mod.SelectedObject(selectedService);
                        //
                        if (filterBySLA == true)
                            mod.SelectedViewMode(vm.Modes.serviceCatalogueBySLA);
                        else
                            mod.SelectedViewMode(vm.Modes.serviceCatalogue);
                        //
                        var oldSizeChanged = ctrl.SizeChanged;
                        ctrl.SizeChanged = function () {
                            oldSizeChanged();
                            var width = ctrl.GetInnerWidth();
                            var height = ctrl.GetInnerHeight();
                            //
                            mod.SetCategoryContorolTopLayer();
                            mod.$Region.css('width', width + 'px').css('height', height + 'px');
                            //
                            mod.ResizeCategoryControl(null, width);
                        };
                        //
                        ctrl.SizeChanged();
                        //
                        hideSpinner();
                    });
                    ko.applyBindings(mod, rootElement);
                    //
                    $(window).resize(function () {
                        if (mod && mod.UpdateScrollButtonsVisibility)
                            mod.UpdateScrollButtonsVisibility();//показываем или скрываем кнопки скролла
                    });
                });
                //
                return retval.promise();
            };
            //Форма статьи БЗ
            //Идентификатор статьи; функция, инициирующая поиск статей по тегу
            self.ShowKBAView = function (id, problemID) {//если задан problemID, то открываем форму создания статьи по проблеме
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {}
                var ctrl = undefined;
                var mod = undefined;
                buttons[getTextResource('ButtonCreate')] = function () {
                    var d = mod.SaveEditClick();
                    $.when(d).done(function (retval) {
                        if (retval)
                            ctrl.Close();
                    });
                };
                buttons[getTextResource('Close')] = function () { ctrl.Close(); }
                //
                ctrl = new fc.control('kbaViewer', 'kbaViewer', getTextResource('KBArticleFormCaption'), true, true, true, 400, 250, buttons, null, 'data-bind="template: {name: \'../UI/Lists/KB/KBArticle\', data: kbArticle, afterRender: AfterRender}"');
                if (!ctrl.Initialized) {
                    hideSpinner();
                    //
                    var wnd = window.open(window.location.protocol + '//' + window.location.host + location.pathname + '?kbArticleID=' + id);
                    if (wnd) //browser cancel it?  
                        return;
                    //
                    require(['sweetAlert'], function () {
                        swal(getTextResource('OpenError'), getTextResource('CantDuplicateForm'), 'warning');
                    });
                    return;
                }
                //
                var ctrlD = ctrl.Show();
                ctrl.ExtendSize(1000, 800);
                //
                require(['../UI/Lists/KB/KBArticle'], function (vm) {
                    var $formDiv = $('#' + ctrl.GetRegionID());
                    mod = new vm.ViewModel(false, $formDiv);
                    //
                    var loadD;
                    if (id)
                        loadD = mod.Load(id);
                    else if (problemID)
                        loadD = mod.CreateNewByProblem(problemID);
                    //
                    $.when(ctrlD, loadD).done(function () {
                        ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                        hideSpinner();
                    });
                });
            };
            //
            //Форма поиска
            self.ShowSearcher = function (openedModule) {
                require(['ui_forms/Search/frmSearch'], function (jsModule) {
                    jsModule.ShowDialog(openedModule, isSpinnerActive);
                });
            };
            //
            //Форма поиска объектов для связывания
            self.ShowSearcherLite = function (findClassIDs, objectClassID, ko_object, parentList, out_SelectedItemNumber, callback) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {}
                var ctrl = undefined;
                buttons[getTextResource('CancelButtonText')] = function () {
                    ctrl.Close();
                }
                //
                var formName = '';
                if (findClassIDs.length == 1) {
                    var findClassID = findClassIDs[0];
                    if (findClassID === 701)
                        formName = getTextResource('AddCall');
                    else if (findClassID === 702)
                        formName = getTextResource('AddProblem');
                    else if (findClassID === 119)
                        formName = getTextResource('AddWorkOrder');
                    else if (findClassID === 371)
                        formName = getTextResource('AddProject');
                }
                else
                    formName = getTextResource('AddLink');
                //
                ctrl = new fc.control('searchFormLite', 'searchFormLite', formName, true, true, true, 800, 500, buttons, null, 'data-bind="template: {name: \'Search/SearchFormLite\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                var ctrlD = ctrl.Show();
                //
                require(['models/Search/searchFormLite'], function (vm) {
                    var mainRegionID = ctrl.GetRegionID();
                    var $region = $('#' + mainRegionID);
                    var mod = new vm.ViewModel($region, ctrl, findClassIDs, objectClassID, ko_object, parentList);
                    //
                    mod.SetClearButtonsList = function () {
                        var buttons = {};
                        buttons = {
                            "cancel": {
                                text: getTextResource('CancelButtonText'),
                                click: function () { ctrl.Close(); }
                            }
                        };
                        //
                        ctrl.UpdateButtons(buttons);
                    };
                    mod.SetFilledButtonsList = function () {
                        var buttons = {};
                        buttons = {
                            'select': {
                                text: getTextResource('Select'),
                                click: function () {
                                    if (findClassIDs.length == 1) {
                                        var findClassID = findClassIDs[0];
                                        if (findClassID === 701)
                                            mod.callList().OnSelectBtnClick();
                                        else if (findClassID === 702)
                                            mod.problemList().OnSelectBtnClick();
                                        else if (findClassID === 119)
                                            mod.workorderList().OnSelectBtnClick();
                                        else if (findClassID === 371)
                                            mod.projectList().OnSelectBtnClick();
                                    }
                                    //
                                    ctrl.Close();
                                }
                            },
                            "cancel": {
                                text: getTextResource('CancelButtonText'),
                                click: function () { ctrl.Close(); }
                            }
                        };
                        //
                        ctrl.UpdateButtons(buttons);
                    };
                    //
                    mod.SelectedItemNumber = out_SelectedItemNumber;
                    mod.callback = callback;
                    mod.Load();
                    $.when(ctrlD).done(function () {
                        ko.applyBindings(mod, document.getElementById(mainRegionID));
                        hideSpinner();
                    });
                });
            };
            //
            //Форма поиска клиента
            self.ShowClientSearcher = function (phoneString) {
                //функция поиска в модели текста
                var runSearchByPhone = function (clientSearchModel, searchText) {
                    $.when(clientSearchModel.searcherModelD).done(function (searcher) {
                        //searcher loaded
                        searcher.LoadD.done(function () {
                            //searcher rendered
                            var tb = $('#' + clientSearchModel.MainRegionID).find('.callClientSearchForm__searcher .text-input');
                            tb.focus();//чтобы фокус был в поле ввода
                            //
                            if (searchText) {
                                clientSearchModel.Phrase(searchText);//запись фразы в поле
                                searcher.SetSearcherName('UserPhoneSearcher');//поиск пользователей только по телефону!
                                var d = searcher.search(searchText);//поиск по фразе
                                $.when(d).done(function () {//окончание поиска
                                    if (searcher.Items().length == 1)
                                        searcher.Items()[0].Click();//выбрать его
                                    else if (searcher.Items().length > 0)
                                        searcher.Show();//показать все результаты
                                    //
                                    searcher.SetSearcherName('WebUserSearcher');//поиск пользователей по всем полям
                                });
                            }
                            else {
                                searcher.Close();
                                setTimeout(searcher.Close, 500);//first searchAction finished
                            }
                        });
                    });
                };
                //
                if (isSpinnerActive != true)
                    showSpinner();
                //
                if ($.instanceOfClientSearcher) {//singltone
                    //если хотим, чтобы искало в той же форме - раскомментить
                    //runSearchByPhone($.instanceOfClientSearcher, phoneString);
                    hideSpinner();
                    return;
                }
                //
                var buttons = {}
                var ctrl = undefined;
                buttons[getTextResource('CancelButtonText')] = function () {
                    ctrl.Close();
                }
                ctrl = new fc.control('clientSearchForm', 'clientSearchForm', getTextResource('ClientSearch'), true, true, true, 800, 600, buttons, null, 'data-bind="template: {name: \'ClientSearch/ClientSearchForm\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                var ctrlD = ctrl.Show();
                ctrl.BeforeClose = function () {
                    $.instanceOfClientSearcher = null;
                    return true;
                };
                //
                require(['models/ClientSearch/clientSearchForm'], function (vm) {
                    var mod = new vm.ViewModel();
                    $.instanceOfClientSearcher = mod;
                    mod.MainRegionID = ctrl.GetRegionID();
                    mod.Load();
                    $.when(ctrlD).done(function () {
                        //form loaded
                        ko.applyBindings(mod, document.getElementById(mod.MainRegionID));
                        hideSpinner();
                        //
                        $.when(mod.isLoaded).done(function () {
                            //model rentered
                            runSearchByPhone(mod, phoneString);
                        });
                    });
                });
            };
            //
            //Форма отклонения
            self.ShowCalendarExclusion = function (calendarExclusion, onSave) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                $.when(operationIsGrantedD(676), operationIsGrantedD(675), operationIsGrantedD(678)).done(function (exclusion_add, exclusion_properties, exclusion_update) {
                    if (exclusion_properties != true) {
                        require(['sweetAlert'], function () {
                            swal(getTextResource('OperationError'));
                        });
                        return;
                    }
                    //
                    var buttons = {}
                    var ctrl = undefined;
                    var mod = null;
                    //
                    if (calendarExclusion.ID && exclusion_update == true || !calendarExclusion.ID && exclusion_add == true) {
                        var bOK_text = calendarExclusion.ID ? getTextResource('ButtonSave') : getTextResource('Add');
                        buttons[bOK_text] = function () {
                            if (mod != null) {
                                $.when(mod.Save()).done(function (value) {
                                    if (value == true) {
                                        if (onSave)
                                            onSave();
                                        //
                                        ctrl.Close();
                                    }
                                });
                            }
                            else ctrl.Close();
                        };
                    }
                    buttons[getTextResource('CancelButtonText')] = function () {
                        ctrl.Close();
                    }
                    ctrl = new fc.control('calendarExclusionForm', 'calendarExclusionForm', getTextResource('CalendarExclusion'), true, true, false, 350, 300, buttons, null, 'data-bind="template: {name: \'TimeManagement/CalendarExclusion\', afterRender: AfterRender}"');
                    if (!ctrl.Initialized)
                        return;
                    var ctrlD = ctrl.Show();
                    //
                    require(['models/TimeManagement/CalendarExclusion'], function (vm) {
                        mod = new vm.ViewModel(calendarExclusion);
                        mod.MainRegionID = ctrl.GetRegionID();
                        $.when(ctrlD).done(function () {
                            hideSpinner();
                            ko.applyBindings(mod, document.getElementById(mod.MainRegionID));
                        });
                    });
                });
            };
            //
            //Редактор полей для формы заявки (описание шаблонов, если нужны обертки)
            self.SDEditorTemplateModes = {
                richEdit: { template: '', name: 'richEdit' },
                htmlEdit: { template: '', name: 'htmlEdit' },
                searcherEdit: { template: 'SDForms/EditFieldTemplates/SimpleSelect', name: 'objectSearcher' },
                searcherEditWithQueue: { template: 'SDForms/EditFieldTemplates/SelectExecutorWithQueue', name: 'ExecutorWithQueueSearcher' },
                textEdit: { template: 'SDForms/EditFieldTemplates/TextEditor', name: 'textEdit' },
                singleLineTextEdit: { template: 'SDForms/EditFieldTemplates/SingleLineTextEditor', name: 'textEdit' },
                parameterEdit: { template: 'SDForms/EditFieldTemplates/ParameterEditorsList', name: 'parameterEdit' },
                comboBoxEdit: { template: 'SDForms/EditFieldTemplates/ComboBoxEditor', name: 'comboBoxEdit' },
                dateEdit: { template: 'SDForms/EditFieldTemplates/DateEditor', name: 'dateEdit' },
                timeEdit: { template: 'SDForms/EditFieldTemplates/TimeEditor', name: 'timeEdit' },
                numberEdit: { template: 'SDForms/EditFieldTemplates/NumberEditor', name: 'numberEdit' },
                ipAddressEdit: { template: 'SDForms/EditFieldTemplates/IPAddressEditor', name: 'ipAddressEdit' }
            };
            //режим, опции (смотри EditField - для каждого редактора свои)
            self.ShowSDEditor = function (mode, options) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var mod = null;
                var buttons = {};
                var ctrl = undefined;
                //
                ctrl = new fc.control('SDEditor', options.fieldName, getTextResource('SDEditorCaption') + " '" + options.fieldFriendlyName + "'", true, true, true, 400, 500, buttons, null, '');
                if (!ctrl.Initialized)
                    return;
                ctrl.BeforeClose = function () {
                    if (mod && mod.closeAction)
                        mod.closeAction();
                    if (options.onClose)
                        setTimeout(options.onClose, 500);
                    return true;
                };
                ctrl.OverlayClick = function (e) {//если в редакторе тыкаем вне его - переспросим о сохранении
                    if (closeRegions())
                        return;
                    //
                    require(['sweetAlert'], function () {
                        swal({
                            title: getTextResource('FormClosing'),
                            text: getTextResource('FormClosingQuestion'),
                            showCancelButton: true,
                            closeOnConfirm: true,
                            closeOnCancel: true,
                            confirmButtonText: getTextResource('ButtonOK'),
                            cancelButtonText: getTextResource('ButtonCancel')
                        },
                            function (value) {
                                if (value == true) {
                                    setTimeout(function () {
                                        ctrl.Close();
                                    }, 300);//TODO? close event of swal
                                }
                            });
                    });
                    e.stopPropagation();
                };
                //
                var $region = $('#' + ctrl.GetRegionID());
                $region.append('<div class="edit-field-template" data-bind="template: {name: TemplateName, afterRender: AfterRender }"></div>');
                //
                var ctrlD = ctrl.Show();
                //
                require(['models/SDForms/EditField'], function (vm) {
                    mod = new vm.ViewModel(mode, options);
                    mod.$region = $region;
                    mod.applyTemplate = function (specifiedModel) {
                        if (['Call.Initiator', 'Call.Client', 'Call.Owner', 'Call.Executor', 'Call.Accomplisher', 'WorkOrder.Initiator', 'WorkOrder.Assignor', 'WorkOrder.Executor', 'Problem.Owner',
                            'NetworkDevice.Utilizer', 'NetworkDevice.Administrator', 'TerminalDevice.Utilizer', 'TerminalDevice.Administrator', 'Adapter.Utilizer', 'Adapter.Administrator', 'Peripheral.Utilizer', 'Peripheral.Administrator',
                            'SoftwareLicence.Utilizer'].indexOf(options.fieldName) != -1) {
                            var d = ctrl.ExtendSize(500, 400);
                            $.when(d, mod.objectSearcherControlD).done(function () {
                                if (mod.objectSearcherControl != null)
                                    mod.objectSearcherControl.Show();
                            });
                        }
                        else if (mode.name == 'htmlEdit')
                            ctrl.ExtendSize(800, 500);
                        //else if (['Negotiation.Message'].indexOf(options.fieldName) != -1) {
                        //    ctrl.settingsExists = false;
                        ////    ctrl.ExtendSize(350, 80);
                        //}
                        //
                        ko.applyBindings(specifiedModel, document.getElementById(ctrl.GetRegionID()));
                    };
                    mod.cancelEdit = function () {
                        ctrl.Close();
                    };
                    //
                    mod.SetClearButtonsList = function () {
                        var buttons = {};
                        buttons[getTextResource('CancelButtonText')] = function () {
                            if (mod && mod.cancelEdit)
                                mod.cancelEdit();
                            else
                                ctrl.Close();
                        };
                        //
                        ctrl.UpdateButtons(buttons);
                    };
                    mod.SetFilledButtonsList = function () {
                        var buttons = {};
                        buttons[getTextResource('ButtonSave')] = function () {
                            if (mod != null) {
                                showSpinner();
                                $.when(mod.Save(false)).done(function (needClose) {
                                    if (needClose)
                                        ctrl.Close();
                                    hideSpinner();
                                });
                            }
                            else ctrl.Close();
                        };
                        buttons[getTextResource('CancelButtonText')] = function () {
                            if (mod && mod.cancelEdit)
                                mod.cancelEdit();
                            else
                                ctrl.Close();
                        };
                        //
                        ctrl.UpdateButtons(buttons);
                    };
                    //
                    if (options.readOnly === true)
                        mod.SetClearButtonsList();
                    else
                        mod.SetFilledButtonsList();
                    //
                    var loadD = mod.Load();
                    $.when(ctrlD, loadD).done(function () {
                        hideSpinner();
                        mod.Focus();
                    });
                });
            };
            //
            self.ShowClientInfoEditorForm = function (options, ClientObj) {
                $.when(operationIsGrantedD(71)).done(function (operation) {
                    if (operation == true)
                        require(['../Templates/ClientSearch/ClientEditForm'], function (EditForm) {
                            EditForm.ShowDialog(options, ClientObj);
                        });
                    else if (isSpinnerActive)
                        hideSpinner();
                });
            };
            //
            //Вызов формы работы
            self.ShowManhoursWorkForm = function (workObject, canEdit_object, options) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {}
                var ctrl = undefined;
                var mod = undefined;
                buttons[getTextResource('ButtonCancel')] = function () {
                    ctrl.Close();
                };
                buttons[getTextResource('ButtonSave')] = function () {
                    if (!canEdit_object()) {
                        ctrl.Close();
                        return;
                    }
                    //
                    if (options.onSave && mod) {
                        showSpinner();
                        $.when(mod.CheckValues()).done(function (result) {
                            if (result) {
                                $.when(mod.Save()).done(function (newObject) {
                                    hideSpinner();
                                    //
                                    if (newObject) {
                                        options.onSave(newObject);
                                        ctrl.Close();
                                    }
                                });
                            }
                            else hideSpinner();
                        });
                    }
                    else ctrl.Close();
                };
                //
                ctrl = new fc.control('manhoursWorkForm', 'manhoursWorkForm', getTextResource('EditManhoursWorkCaption'), true, true, true, 500, 250, buttons, null, 'data-bind="template: {name: \'Manhours/ManhoursWorkForm\', afterRender: AfterRender }"');
                if (!ctrl.Initialized) {
                    hideSpinner();
                    require(['sweetAlert'], function () {
                        swal(getTextResource('OpenError'), getTextResource('CantDuplicateForm'), 'warning');
                    });
                    return;
                }
                //
                var ctrlD = ctrl.Show();
                ctrl.ExtendSize(650, 450);
                //
                ctrl.BeforeClose = function () {
                    if (mod)
                        mod.Unload();
                    return true;
                };
                //
                require(['models/SDForms/ManhoursWorkForm'], function (vm) {
                    var region = $('#' + ctrl.GetRegionID());
                    mod = new vm.ViewModel(workObject, canEdit_object, region, options);
                    //
                    mod.ForseClose = function () {
                        ctrl.Close();
                    };
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD, mod.LoadD).done(function (ctrlResult, loadResult) {
                        hideSpinner();
                    });
                });
            };
            //
            //Вызов формы списка работ объекта
            self.ShowManhoursWorkList = function (ko_object, objectClassID, canEdit_object) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {};
                var ctrl = undefined;
                var mod = undefined;
                buttons[getTextResource('Close')] = function () { ctrl.Close(); }
                //
                ctrl = new fc.control('manhoursWorkList', 'manhoursWorkList', getTextResource('ManhoursWorkTooltip'), true, true, true, 400, 250, buttons, null, 'data-bind="template: { name: \'Manhours/ManhoursWorkList\', afterRender: AfterRender }"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                ctrl.ExtendSize(550, 350);
                //
                ctrl.BeforeClose = function () {
                    if (mod)
                        mod.Unload();
                    return true;
                };
                //
                require(['models/SDForms/SDForm.ManhoursWorkList'], function (vm) {
                    mod = new vm.ViewModel(ko_object, objectClassID, canEdit_object, ctrl.GetRegionID());
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD, mod.LoadD).done(function (ctrlResult, loadResult) {
                        if (loadResult)
                            mod.RefreshManhours();
                        //
                        hideSpinner();
                    });
                });
            };
            //
            //Редактирование трудозатрат
            self.ShowManhoursEditor = function (manhour, work, onSave) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {};
                var ctrl = undefined;
                var mod = undefined;
                buttons[getTextResource('CancelButtonText')] = function () {
                    ctrl.Close();
                };
                buttons[getTextResource('ButtonSave')] = function () {
                    if (onSave) {
                        showSpinner();
                        $.when(mod.CheckValues()).done(function (result) {
                            if (result) {
                                $.when(mod.Save()).done(function (retval) {
                                    hideSpinner();
                                    //
                                    if (onSave && retval) {
                                        onSave(retval);
                                        ctrl.Close();
                                    }
                                });
                            }
                            else hideSpinner();
                        });
                    }
                    else ctrl.Close();
                };
                //
                ctrl = new fc.control('manhEdit', 'manhEdit', getTextResource('EditManhoursCaption'), true, false, false, 350, 230, buttons, null, 'data-bind="template: {name: \'Manhours/ManhourEditor\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                //
                ctrl.BeforeClose = function () {
                    if (mod)
                        mod.Unload();
                    return true;
                };
                //
                require(['models/SDForms/SDForm.ManhourEditor'], function (vm) {
                    mod = new vm.ViewModel(manhour, work, ctrl.GetRegionID());
                    //
                    mod.ForseClose = function () {
                        ctrl.Close();
                    };
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD, mod.LoadD).done(function () {
                        hideSpinner();
                        //
                        mod.Initialize();
                    });
                });
            };
            //
            //Форма согласования
            //при вызове не из формы заявки помнить про workflow
            self.ShowNegotiation = function (negID, objID, objClassID, canEdit_object, voteCallback, options) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {};
                var ctrl = undefined;
                var mod = undefined;
                buttons[getTextResource('Close')] = function () {
                    if (mod && mod.cancelEdit)
                        mod.cancelEdit();
                    else
                        ctrl.Close();
                };
                buttons[getTextResource('ButtonSave')] = function () {
                    if (mod != null) {
                        if (mod.Finished())
                            ctrl.Close();
                        else if (mod.IsValid()) {
                            showSpinner();
                            $.when(mod.Save()).done(function (result) {
                                if (result)
                                    ctrl.Close();
                                //
                                hideSpinner();
                            });
                        }
                    }
                    else ctrl.Close();
                };
                //
                ctrl = new fc.control('negForm', 'negForm', getTextResource('Negotiation'), true, true, true, 680, 500, buttons, null, 'data-bind="template: {name: \'Negotiation/NegotiationForm\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                ctrl.BeforeClose = function () {
                    if (mod && mod.WasChanged() && voteCallback)
                        voteCallback(mod.negotiationID);
                    //
                    if (mod)
                        mod.Unload();
                    //
                    return true;
                };
                //
                var ctrlD = ctrl.Show();
                //
                require(['models/SDForms/NegotiationForm'], function (vm) {
                    mod = new vm.ViewModel(negID, objID, objClassID, canEdit_object, ctrl.GetRegionID());
                    mod.ForseClose = function () {
                        voteCallback = null;//чтобы не было коллбека и просьбы обновить
                        ctrl.Close();
                    };
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD).done(hideSpinner);
                    $.when(mod.LoadD).done(function () {
                        if (options)
                            mod.ApplyValues(options);
                        else mod.HaveUnsaved(true);
                    });
                });
            };
            //
            //Форма комментария
            self.ShowNegotiationMessage = function (negID, objID, theme, comment, userID) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {};
                var ctrl = undefined;
                var mod = undefined;                
                buttons[getTextResource('ButtonSave')] = function () {
                    //if (mod.Comment.trim().length < 5 ) {
                    //        require(['sweetAlert'], function () {
                    //            swal(getTextResource('SaveError'), getTextResource('CommentMustCharacters'), 'error');
                    //        });
                    //        return;
                    //    }
                    if (mod != null && mod.PostMessage) {
                        $.when(mod.PostMessage()).done(function (obj) {
                            if (obj) {
                                comment(obj.Message)
                                ctrl.Close();
                            }
                            else if (obj == null) {
                                comment(' ')
                                ctrl.Close();
                            };
                            hideSpinner();
                        });
                    }                                         
                    else ctrl.Close();
                };
                //
                if (theme)
                    var voteTheme = (getTextResource('AddingСommentQuestion') + (' ') + ('"') + (theme) + ('"'));
                else
                    var voteTheme = getTextResource('AddingСommentQuestion');
                //
                buttons[getTextResource('ButtonCancel')] = function () {
                    ctrl.Close();
                };
                //
                //
                ctrl = new fc.control('negFormMessage', 'negFormMessage', voteTheme, true, false, false, 400, 220, buttons, null, 'data-bind="template: {name: \'Negotiation/NegotiationMessage\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                //
                ctrl.BeforeClose = function () {
                    if (mod)
                        mod.Unload();
                    return true;
                };
                //
                require(['models/SDForms/SDForm.NegotiationMessage'], function (vm) {
                    mod = new vm.ViewModel(negID, objID, comment, ctrl.GetRegionID(), userID);
                    mod.ForseClose = function () {
                        voteCallback = null;//чтобы не было коллбека и просьбы обновить
                        ctrl.Close();
                        //
                        if (onForceCloseCallback)
                            onForceCloseCallback();
                    };
                    $(document).unbind('objectDeleted', mod.onObjectModified).bind('objectDeleted', mod.onObjectModified);
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD).done(function () {
                        var textbox = $(document).find('.negotiation-message-form-comment');
                        textbox.click();
                        textbox.focus();
                        hideSpinner();
                    });
                });
            };
            //
            //Голосовалка для согласования
            //при вызове не из формы заявки помнить про workflow
            self.ShowNegotiationVote = function (negID, isFinance, objID, objClassID, vote, voteCallback, onForceCloseCallback, settingCommentPlacet, settingCommentNonPlacet, theme, user) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {};
                var ctrl = undefined;
                var mod = undefined;
                var voteTheme = undefined;
                buttons[getTextResource('ButtonSave')] = function () {
                    if (settingCommentPlacet == true && mod.Vote() == 1)
                        if (mod.Comment().trim().length < 5) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('CommentMustCharacters'), 'error');
                            });
                            return;
                        }
                    if (settingCommentNonPlacet == true && mod.Vote() == 2)
                        if (mod.Comment().trim().length < 5) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('CommentMustCharacters'), 'error');
                            });
                            return;
                        }
                    if (mod != undefined && mod.PostVote && mod.Vote && mod.Vote() != 0) {
                        showSpinner();
                        $.when(mod.PostVote()).done(function (obj) {
                            if (obj && voteCallback) {
                                voteCallback(obj);
                                ctrl.Close();
                            }
                            //
                            hideSpinner();
                        });
                    }
                };
                //
                if (theme) 
                    var voteTheme = (getTextResource('VoteTheIssue') + (' ') + ('"') + (theme) + ('"'));
                else
                    var voteTheme = getTextResource('VoteTheIssue');
                //
                buttons[getTextResource('ButtonCancel')] = function () {
                    ctrl.Close();
                };

                ctrl = new fc.control('negVote', 'negVote', voteTheme, true, false, false, 400, 290, buttons, null, 'data-bind="template: {name: \'Negotiation/NegotiationVote\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                //
                ctrl.BeforeClose = function () {
                    if (mod)
                        mod.Unload();
                    return true;
                };
                //
                require(['models/SDForms/SDForm.NegotiationVote'], function (vm) {
                    mod = new vm.ViewModel(negID, isFinance, objID, objClassID, vote, ctrl.GetRegionID(), user);
                    if (settingCommentPlacet)
                        mod.SettingCommentPlacet(settingCommentPlacet);
                    if (settingCommentNonPlacet)
                        mod.SettingCommentNonPlacet(settingCommentNonPlacet);
                    mod.ForseClose = function () {
                        voteCallback = null;//чтобы не было коллбека и просьбы обновить
                        ctrl.Close();
                        //
                        if (onForceCloseCallback)
                            onForceCloseCallback();
                    };
                    $(document).unbind('objectDeleted', mod.onObjectModified).bind('objectDeleted', mod.onObjectModified);
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    // 
                    $.when(ctrlD).done(function () {
                        var textbox = $(document).find('.negotiation-vote-form-comment');
                        textbox.click();
                        textbox.focus();
                        hideSpinner();
                    });
                });
            };
            //История
            self.ShowNegotiationHistory = function (negID, objID, theme) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var ctrl = undefined;
                var mod = undefined;
                var voteTheme = undefined;
                var buttons = {}
                buttons[getTextResource('Close')] = function () {              
                        ctrl.Close();
                };
                //
                if (theme)
                    var voteTheme = (getTextResource('NegotiationsHistoryQuestion') + (' ') + ('"') + (theme) + ('"'));
                else
                    var voteTheme = getTextResource('NegotiationsHistoryQuestion');
                //
                ctrl = new fc.control('negotiationFromHistory', 'negotiationFromHistory', voteTheme, true, true, true, 455, 539, buttons, null, 'data-bind="template: {name: \'Negotiation/NegotiationHistory\'}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                //require(['models/SDForms/SDForm.NegotiationHistory'], function (vm) {
                    require(['models/SDForms/Negotiation.History'], function (vm) {
                    mod = new vm.ViewModel(negID, objID, ctrl.GetRegionID());
                    var loadD = mod.CheckData();

                    //
                    $.when(ctrlD, loadD).done(function () {
                        ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                        hideSpinner();
                    });
                });
            };
            //
            //вспомогательная панель для поля решение
            self.ShowHelpSolutionPanel = function (frm, mod, ko_object) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var dialogDIV = frm.GetDialogDIV();
                var helpPanelID = frm.GetRegionID() + '_helpPanel';
                var helpModel = null;
                //
                dialogDIV.append('<div id="' + helpPanelID + '" data-bind="template: {name: \'SDForms/Controls/SolutionHelp\', afterRender: AfterRenderHelpPanel}" ></div>');
                dialogDIV.css('overflow', 'visible');
                //
                require(['models/SDForms/SDForm.SolutionHelp'], function (vm) {
                    helpModel = new vm.ViewModel(mod, ko_object, mod.objectClassID, '#' + helpPanelID + ' .left-solution-help_panel');
                    mod.LeftPanelModel = helpModel;
                    mod.AfterRenderHelpPanel = function () {
                        hideSpinner();
                        helpModel.Load();
                    };
                    //
                    var helpElem = document.getElementById(helpPanelID)
                    ko.applyBindings(mod, helpElem);
                });
            };
            //
            //форма смены состояния табеля сотрудника
            self.ShowTimeSheetSetStateForm = function (timeSheetArray, newTimeSheetState) {
                var formCaption = '';
                var actionButtonText = '';
                var result = false;//состояние было изменено успешно
                var retval = $.Deferred();//окончание работы с формой                
                //
                if (isSpinnerActive != true)
                    showSpinner();
                //
                switch (newTimeSheetState) {
                    case 1://review
                        formCaption = getTextResource('TM_ToReviewStateCaption');
                        actionButtonText = getTextResource('TM_ReviewButton');
                        break;
                    case 2://rejected
                        formCaption = getTextResource('TM_ToRejectedStateCaption');
                        actionButtonText = getTextResource('TM_RejectButton');
                        break;
                    case 3://approved
                        formCaption = getTextResource('TM_ToApprovedStateCaption');
                        actionButtonText = getTextResource('TM_ApproveButton');
                        break;
                    default://0 or error
                        throw 'not supptorted mode';
                }
                //
                var mod = null;
                var buttons = {};
                var ctrl = undefined;
                buttons[actionButtonText] = function () {
                    if (mod != null) {
                        showSpinner();
                        $.when(mod.SetStateByForm()).done(function (needClose) {
                            if (needClose) {
                                result = true;
                                ctrl.Close();
                            }
                            //
                            hideSpinner();
                        });
                    }
                    else {
                        result = false;
                        ctrl.Close();
                    }
                };
                buttons[getTextResource('CancelButtonText')] = function () {
                    result = false;
                    ctrl.Close();
                };
                //
                var afterClose = function () {
                    retval.resolve(result);
                };
                ctrl = new fc.control('tm_setStateForm', 'timeSheet_setState', formCaption, true, true, true, 500, 400, buttons, afterClose, 'data-bind="template: {name: \'TimeManagement/SetStateForm\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                //
                require(['models/TimeManagement/SetStateForm'], function (vm) {
                    var region = ctrl.GetRegionID();
                    mod = new vm.ViewModel($(region), timeSheetArray, newTimeSheetState);
                    //
                    ko.applyBindings(mod, document.getElementById(region));
                    $.when(ctrlD).done(hideSpinner);
                });
                //
                return retval.promise();
            };
            //

            //
            self.ShowAssetFromStorage = function (selectedObjects) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var ctrl = undefined;
                var mod = undefined;
                var buttons = {}
                buttons['Установить со склада'] = function () {
                    var d = mod.SetFromStorage();
                    $.when(d).done(function (result) {
                        if (result == null)
                            return;
                        //
                        ctrl.Close();
                    });
                };
                //
                ctrl = new fc.control('assetFromStorage', 'assetFromStorage', 'Установка со склада', true, true, true, 1037, 597, buttons, null, 'data-bind="template: {name: \'AssetForms/AssetOperations/AssetFromStorage\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                //
                require(['models/AssetForms/AssetOperations/AssetFromStorage'], function (vm) {
                    var mainRegionID = ctrl.GetRegionID();
                    var $region = $('#' + mainRegionID);
                    mod = new vm.ViewModel($region, ctrl, selectedObjects);
                    mod.Load();
                    //
                    var oldSizeChanged = ctrl.SizeChanged;
                    ctrl.SizeChanged = function () {
                        oldSizeChanged();
                        mod.SizeChanged();
                    };
                    //
                    $.when(ctrlD).done(function () {
                        ko.applyBindings(mod, document.getElementById(mainRegionID));
                        hideSpinner();
                    });
                });
            };

            self.ShowAssetToRepair = function (selectedObjects) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var ctrl = undefined;
                var mod = undefined;
                var buttons = {}
                buttons['Отправить в ремонт'] = function () {
                    var d = mod.AssetToRepair();
                    $.when(d).done(function (result) {
                        if (result == null)
                            return;
                        //
                        ctrl.Close();
                    });
                };
                //
                ctrl = new fc.control('assetToRepair', 'assetToRepair', 'Отправка в ремонт', true, true, true, 1037, 650, buttons, null, 'data-bind="template: {name: \'AssetForms/AssetOperations/AssetToRepair\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                //
                require(['models/AssetForms/AssetOperations/AssetToRepair'], function (vm) {
                    var mainRegionID = ctrl.GetRegionID();
                    var $region = $('#' + mainRegionID);
                    mod = new vm.ViewModel($region, ctrl, selectedObjects);
                    mod.Load();
                    //
                    var oldSizeChanged = ctrl.SizeChanged;
                    ctrl.SizeChanged = function () {
                        oldSizeChanged();
                        mod.SizeChanged();
                    };
                    //
                    $.when(ctrlD).done(function () {
                        ko.applyBindings(mod, document.getElementById(mainRegionID));
                        hideSpinner();
                    });
                });
            };
            //
            //форма выбора значений дерева в отдельном окне
            self.ShowTreeControlAtWindow = function (settings, rootTreeValues, currentSelectedNode, selectCallback, windowCaption) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {};
                var ctrl = undefined;
                var mod = undefined;
                buttons[getTextResource('Close')] = function () { ctrl.Close(); };
                var caption = windowCaption ? windowCaption : getTextResource('FilterChooseOperation')
                //
                ctrl = new fc.control('treeControlAtWindow', 'treeControlAtWindow', caption, true, true, true, 400, 250, buttons, null, 'data-bind="template: { name: \'Navigator/TreeControlWindow\', afterRender: AfterRender }"');
                if (!ctrl.Initialized)
                    return;
                //
                var ctrlD = ctrl.Show();
                ctrl.ExtendSize(550, 350);
                //
                require(['treeControl'], function (treeLib) {
                    mod = new treeLib.windowModel(settings, ctrl.GetRegionID());
                    //
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD, mod.LoadD).done(function (ctrlResult, loadResult) {
                        hideSpinner();
                        //
                        if (rootTreeValues)
                            mod.SetRootValues(rootTreeValues);
                        if (currentSelectedNode)
                            mod.SetSelected(currentSelectedNode, selectCallback);
                    });
                });
            };
            //
            //Вызов формы замещений 
            self.ShowDeputyUser = function (userID,IsUserSettings, userName) {
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {}
                var ctrl = undefined;
                var Deputy = undefined;    
                var controlName = getTextResource('SubstitutionUser') + ' ' + userName;
                //
                ctrl = new fc.control('deputyUserForm', 'deputyUserForm', controlName, true, true, true, 1050, 500, buttons, null, 'data-bind="template: {name: \'Account/DeputyTable\' }"');
                if (!ctrl.Initialized) {
                    hideSpinner();
                    require(['sweetAlert'], function () {
                        swal(getTextResource('OpenError'), getTextResource('CantDuplicateForm'), 'warning');
                    });
                    return;
                }
                //
                var ctrlD = ctrl.Show();
                ctrl.ExtendSize(1050, 500);
                //
                ctrl.BeforeClose = function () {
                    return true;
                };
                //
                require(['models/Account/DeputyTable'], function (vm) {
                    Deputy = new vm.ViewModel(userID, IsUserSettings);
                    //
                    Deputy.ForseClose = function () {
                        ctrl.Close;
                    };
                    Deputy.Deputy(Deputy);
                    //
                    ko.applyBindings(Deputy, document.getElementById(ctrl.GetRegionID()));
                    $.when(ctrlD, Deputy.LoadD).done(function (ctrlResult, loadResult) {
                        hideSpinner();
                    });
                });
            };
        }
    }
    return module;
});