define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        //сущность knockout, идентификатор класса сущности, режим клиент заявки, селектор ajax-крутилки для загрузки, селектор ajax-крутилки для отправки, рид онли обсервабл,  можно ли редактировать обсервабл, размеры вкладки обсервабл, список пользователей для отображения обсерв
        Tape: function (ko_object, objectClassID, ajaxSelector_load, ajaxSelector_add, readOnly_object, canEdit_object, canViewNotes_obj, tabDim_object, userList_object) {
            var self = this;
            self.CanEdit = canEdit_object; //observable from list
            //
            //
            self.viewModes = {
                discussions: 'discussions',//переписка
                history: 'history',//история
                combo: 'combo',//смешанный вариант
                timeline: 'timeline'//ход обработки
            };
            self.editMode = {
                none: 'none',//не включен режим добавления заметки/сообщения
                message: 'message',//только для заявки
                note: 'note'
            };
            //
            self.viewModeList = [];
            {//формирование доступных представлений
                var createComboBoxItem = function (id, name) { return { ID: id, Name: name } };
                //
                self.viewModeList.push(createComboBoxItem(self.viewModes.discussions, getTextResource('Discussions')));
                self.viewModeList.push(createComboBoxItem(self.viewModes.history, getTextResource('History')));
                self.viewModeList.push(createComboBoxItem(self.viewModes.timeline, getTextResource('TimelineHeader')));
                //TODO
                //self.viewModeList.push(createComboBoxItem(self.viewModes.combo, 'Combo'));
            }
            self.GetViewModeList = function (options) {
                var data = self.viewModeList;
                options.callback({ data: data, total: data.length });
            };
            //
            self.SelectedViewMode = ko.observable(self.viewModeList[0]);//выбранное представление по умолчанию
            self.SelectedViewMode.subscribe(function (newValue) {
                $.when(self.CheckData()).done(function () {
                    if (newValue.ID == self.viewModes.history || newValue.ID == self.viewModes.discussions)
                        self.TabListUpdated();
                });
            });
            self.IsNeedBottomPanel = ko.computed(function () {
                //
                return false;
            });
            //
            self.SelectedEditorMode = ko.observable(self.editMode.none);//выбранный режим редактирования по умолчанию
            self.SelectedEditorMode.subscribe(function (newValue) {
                if (newValue != self.editMode.none && self.htmlControl == null) {
                    showSpinner($(ajaxSelector_add)[0]);
                    require(['htmlControl'], function (htmlLib) {
                        self.htmlControl = new htmlLib.control($(ajaxSelector_add).find('.tape__editor'));
                        self.htmlControl.OnHTMLChanged = function () {
                            self.RefreshEditParenlSize();
                        };
                        self.htmlControl.OnKeyDown = function (e) {
                            if (e.keyCode == 13 && e.ctrlKey) {
                                self.AddNewNote();
                                return false;
                            }
                            else if (e.keyCode == 27 && self.SelectedEditorMode() != self.editMode.none) {
                                self.SelectedEditorMode(self.editMode.none);
                                return false;
                            }
                            else
                                return true;
                        };
                        //
                        $.when(self.htmlControl.firstLoadD).done(function () {
                            $.when(self.htmlControl.frameD).done(function () {
                                hideSpinner($(ajaxSelector_add)[0]);
                            });
                        });
                        //
                        self.htmlControl.Focus();
                    });
                }
                //   
                self.RefreshEditParenlSize();
            });
            //
            self.isNoteListLoaded = ko.observable(false);
            self.NoteList = ko.observableArray([]);//переписка
            self.NoteList.subscribe(function (changes) {
                var needScroll = ko.utils.arrayFirst(changes, function (change) {
                    return (change.status === 'added');
                });
                //
                if (needScroll)
                    self.TabListUpdated();
            }, null, "arrayChange");
            //
            self.isHistoryListLoaded = ko.observable(false);
            self.HistoryList = ko.observableArray([]);//история
            self.HistoryList.subscribe(function (changes) {
                var needScroll = ko.utils.arrayFirst(changes, function (change) {
                    return (change.status === 'added');
                });
                //
                if (needScroll)
                    self.TabListUpdated();
            }, null, "arrayChange");
            //
            self.ComboList = ko.computed(function () {//смешанный вариант
                if (self.isNoteListLoaded() == false || self.isHistoryListLoaded() == false)
                    return [];
                //
                return [];
            });
            self.Tape = ko.computed(function () {//все по текущему представлению
                return self.HistoryList();

            });
            //
            self.ajaxControl_load = new ajaxLib.control();//единственный ajax для загрузки текущего представления
            self.ajaxControl_add = new ajaxLib.control();//единственный ajax для добавления сообщения/заметки
            self.ajaxControl_read = new ajaxLib.control();//единственный ajax для прочтения сообщения / заметки
            self.htmlControl = null;//контрол для ввода заметки/сообщения
            //
            self.isTimeLineLoaded = ko.observable(false);
            self.TimeLineControl = ko.observable(null);
            //
            self.CheckData = function () {//функция загрузки текущего представления   
                var retvalD = $.Deferred();
                if (!self.isHistoryListLoaded()) {
                    self.AppendScroller();  
                    //
                    $.when(self.LoadHistory()).done(function () {
                        self.isHistoryListLoaded(true);
                        self.CalculateTopPosition();
                        retvalD.resolve();
                    });
                }
                else
                    retvalD.resolve();
                //
                self.CalculateTopPosition();
                //
                return retvalD;
            };
            self.ClearData = function () {//функция сброса данных
                self.htmlControl = null;
                self.SelectedEditorMode(self.editMode.none);
                //
                self.isNoteListLoaded(false);
                self.NoteList([]);
                //
                self.isHistoryListLoaded(false);
                self.HistoryList([]);
                //
                self.isTimeLineLoaded(false);
                self.TimeLineControl(null);
            };
            //
            self.AppendScroller = function () {
                var $foundObjects = $(ajaxSelector_load);
                //
                if ($foundObjects.length) {
                    $foundObjects.unbind('scroll', self.OnScroll);
                    $foundObjects.bind('scroll', self.OnScroll);
                }
            };
            //
            self.FullListIsLoaded = false;
            self.historyIsLoading = false;
            //
            self.OnScroll = function () {
                if (self.FullListIsLoaded)
                    return;
                //
                var scrollPosition = 100 * this.scrollTop / (this.scrollHeight - this.clientHeight);
                if (scrollPosition > 80 && !self.historyIsLoading) {
                    self.historyIsLoading = true;
                    var countBefore = self.HistoryList().length;
                    var startIdx = countBefore;
                    //
                    $.when(self.LoadHistory(startIdx)).done(function () {
                        if (self.HistoryList().length == countBefore) {
                            setTimeout(function () {//докрутили до конца списка, больше данных нет - не дадим ничего подгужать 10 сек
                            }, 10000);
                        }
                    });
                }
            };
            //
            self.LoadHistory = function (startIdx) {//получить всю историю, доступную текущему пользователю
                var d = $.Deferred();
                $.when(userD).done(function (user) {
                    self.ajaxControl_load.Ajax($(ajaxSelector_load),
                    {
                        dataType: "json",
                        method: 'GET',
                        data: {
                            'ID': ko_object().ID(),
                            'EntityClassId': ko_object().ClassID(),
                            'ViewName': user.ViewNameSD,
                            'StartIdx': startIdx ? startIdx : 0,
                            'Count': 15
                        },
                        url: 'sdApi/GetAssetHistory'
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            var list = newVal.List;
                            if (list) {
                                //self.HistoryList.removeAll();
                                //
                                if (list.length == 0)
                                    self.FullListIsLoaded = true;
                                //
                                require(['models/SDForms/SDForm.TapeRecord'], function (tapeLib) {
                                    var options = {
                                        entityID: ko_object().ID(),
                                        entityClassID: ko_object().ClassID(),
                                        type: self.viewModes.history
                                    };
                                    ko.utils.arrayForEach(list, function (item) {
                                        self.HistoryList.push(new tapeLib.TapeRecord(item, options));
                                    });
                                    //self.SortTapeRecord(self.HistoryList);
                                    self.HistoryList.valueHasMutated();
                                    self.historyIsLoading = false;
                                });
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    self.historyIsLoading = false;
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[SDForm.Tape.js, LoadHistory]', 'error');
                                });
                            }
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                self.historyIsLoading = false;
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.Tape.js, LoadHistory]', 'error');
                            });
                        else if (newVal && newVal.Result === 2)
                            require(['sweetAlert'], function () {
                                self.historyIsLoading = false;
                                swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.Tape.js, LoadHistory]', 'error');
                            });
                        else if (newVal && newVal.Result === 3)
                            require(['sweetAlert'], function () {
                                self.historyIsLoading = false;
                                swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                self.historyIsLoading = false;
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.Tape.js, LoadHistory]', 'error');
                            });
                        d.resolve();
                    },
                    function () {
                        d.resolve();
                    });
                });
                //
                return d.promise();
            };
            //
            //
            self.SortTapeRecord = function (list_obj) {
                if (!list_obj)
                    return;
                //
                list_obj.sort(
                    function (left, right) {
                        if (left.DateObj() == null)
                            return -1;
                        //
                        if (right.DateObj() == null)
                            return 1;
                        //
                        return left.DateObj() == right.DateObj() ? 0 : (left.DateObj() < right.DateObj() ? -1 : 1);
                    }
                );
            };
            self.TabListUpdated = function () {
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper();
                    fh.ScrollTo($(ajaxSelector_load).find('.tabContent'), 'bottom');
                });
            };
            //
            self.CloseClick = function () {//закрыть контрол ввода текста
                self.SelectedEditorMode(self.editMode.none);
            };
            self.onMouseOver = function (obj, event) {//прочитать сообщение при поднесении мыши
                if (obj.Type() == self.viewModes.discussions && !obj.IsReaded())
                    self.SetReaded(obj, event);
            };
            //
            self.EditPanelHeight = ko.observable(0);//высота панели редактирования текста
            self.RefreshEditParenlSize = function () {//перерасчет высоты контрола для ввода и редактирования текста
                if (self.SelectedEditorMode() == self.editMode.none)
                    self.EditPanelHeight(0);
                else {
                    var height = $(ajaxSelector_add).find('.tape__editor')[0].scrollHeight;
                    if (height == 0) {
                        setTimeout(self.RefreshEditParenlSize, 100);
                        return;
                    }
                    self.EditPanelHeight(height);
                }
            };
            //
            //
            self.BottomTabContent = ko.computed(function () {
                //
                return 0 + 'px';
            });
            //
            self.TopTabContent = ko.observable('45px');//отступ списка сверху
            self.IntervalUpdateTop = null;
            self.CountCheckTopSize = 0;
            self.CountCheckSameSize = 0;
            var resetInterval = function () {
                self.CountCheckTopSize = 0;
                self.CountCheckSameSize = 0;
                clearInterval(self.IntervalUpdateTop);
            };
            self.CalculateTopPosition = function (fromInterval) {
                    resetInterval();
                    var top = 81;
                    self.TopTabContent(top + 'px');
                    return top;
            };
            //
            if (tabDim_object)
                tabDim_object.subscribe(function (newValue) {
                    self.CalculateTopPosition();
                });
        }
    };
    return module;
});