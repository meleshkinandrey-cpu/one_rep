define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        //сущность knockout, идентификатор класса сущности, режим клиент заявки, селектор ajax-крутилки для загрузки, селектор ajax-крутилки для отправки, рид онли обсервабл,  можно ли редактировать обсервабл, размеры вкладки обсервабл, список пользователей для отображения обсерв
        Tape: function (ko_object, objectClassID, ajaxSelector_load, ajaxSelector_add, readOnly_object, canEdit_object, canViewNotes_obj, tabDim_object, userList_object) {
            var self = this;
            self.CanEdit = canEdit_object; //observable from list
            //
            self.CanViewNotes = canViewNotes_obj; //может ли смотреть на заметки
            self.UserList = userList_object; //observable array of users in discussion
            self.UserList.subscribe(function (changes) {
                self.CalculateTopPosition();
            });
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
            self.reloadText = ko.observable(true); // флаг потребности обновления текста
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
                    if (/*newValue.ID == self.viewModes.history || */newValue.ID == self.viewModes.discussions)
                        self.TabListUpdated();
                });
            });
            self.IsNeedBottomPanel = ko.computed(function () {
                if (readOnly_object() == false && self.SelectedViewMode() && (self.SelectedViewMode().ID == self.viewModes.discussions || self.SelectedViewMode().ID == self.viewModes.combo))
                    return true;
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
                                self.htmlControl.SetHTML(get_cookie("SDTapeTextNote"));
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
            function set_cookie(name, value, exp_y, exp_m, exp_d, path, domain, secure) {
                var cookie_string = name + "=" + encodeURIComponent(value);

                if (exp_y) {
                    var expires = new Date(exp_y, exp_m, exp_d);
                    cookie_string += "; expires=" + expires.toGMTString();
                }

                if (path)
                    cookie_string += "; path=" + encodeURIComponent(path);

                if (domain)
                    cookie_string += "; domain=" + encodeURIComponent(domain);

                if (secure)
                    cookie_string += "; secure";

                document.cookie = cookie_string;
            };
            function get_cookie(cookie_name) {        
                let matches = document.cookie.match(new RegExp(
                    "(?:^|; )" + cookie_name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
                ));
                try {
                    return matches ? decodeURIComponent(matches[1]) : '';
                }
                catch (e){
                    return '';
                }
            };
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
            //self.HistoryList.subscribe(function (changes) {
            //    var needScroll = ko.utils.arrayFirst(changes, function (change) {
            //        return (change.status === 'added');
            //    });
            //    //
            //    if (needScroll)
            //        self.TabListUpdated();
            //}, null, "arrayChange");
            //
            self.ComboList = ko.computed(function () {//смешанный вариант
                if (self.isNoteListLoaded() == false || self.isHistoryListLoaded() == false)
                    return [];
                //
                //self.ComboList.sort(
                //    function (left, right) {
                //        return left.Name().toLowerCase() == right.Name().toLowerCase() ? 0 : (left.Name().toLowerCase() < right.Name().toLowerCase() ? -1 : 1);
                //    }
                //);
                //TODO noteList + historyList + sort by date
                return [];
            });
            self.Tape = ko.computed(function () {//все по текущему представлению
                var viewMode = self.SelectedViewMode().ID;
                //
                if (viewMode == self.viewModes.discussions) {
                    if (self.CanViewNotes())
                        return self.NoteList();
                    //
                    var retList = [];
                    ko.utils.arrayForEach(self.NoteList(), function (el) {
                        if (!el.IsNote())
                            retList.push(el);
                    });
                    return retList;
                }
                else if (viewMode == self.viewModes.history)
                    return self.HistoryList();
                else if (viewMode == self.viewModes.combo)
                    return self.ComboList();
                else if (viewMode == self.viewModes.timeline)
                    return [];
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
                if (self.reloadText())
                self.SelectedEditorMode(self.editMode.none);
                //
                var retvalD = $.Deferred();
                var needNote = false;
                var needHistory = false;
                var viewMode = self.SelectedViewMode().ID;
                //
                if (viewMode == self.viewModes.timeline)
                {
                    if (self.TimeLineControl == null || self.isTimeLineLoaded() == false)
                        $.when(self.LoadTimeLine()).done(function () {
                            self.isTimeLineLoaded(true);
                            self.CalculateTopPosition();
                            retvalD.resolve();
                        });
                }
                else if (viewMode == self.viewModes.discussions)
                    needNote = !self.isNoteListLoaded();
                else if (viewMode == self.viewModes.history)
                    needHistory = !self.isHistoryListLoaded();
                else if (viewMode == self.combo) {
                    needNote = !self.isNoteListLoaded();
                    needHistory = !self.isHistoryListLoaded();
                }
                //
                if (needNote && needHistory) {
                    $.when(self.LoadMessages(), self.LoadHistory()).done(function () {
                        self.isNoteListLoaded(true);
                        self.isHistoryListLoaded(true);
                        self.AppendScroller();
                        self.CalculateTopPosition();
                        retvalD.resolve();
                    });
                }
                else if (needNote) {
                    $.when(self.LoadMessages()).done(function () {
                        self.isNoteListLoaded(true);
                        self.CalculateTopPosition();
                        retvalD.resolve();
                    });
                }
                else if (needHistory) {
                    $.when(self.LoadHistory()).done(function () {
                        self.isHistoryListLoaded(true);
                        self.AppendScroller();
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
                let tmpText = self.htmlControl != null ? self.htmlControl.html : '';
                set_cookie("SDTapeTextNote", tmpText);
                setTimeout(function () {
                self.htmlControl = null
                }, 500);
                self.SelectedEditorMode(self.editMode.none);
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
            self.LoadMessages = function () {//получить всю переписку, доступную текущему пользователю
                var data = {
                    'ID': ko_object().ID(),
                    'OnlyMessages': !self.CanViewNotes(),
                    'EntityClassId': objectClassID
                };
                var d = self.ajaxControl_load.Ajax($(ajaxSelector_load),
                    {
                        dataType: "json",
                        method: 'GET',
                        data: data,
                        url: 'sdApi/GetNoteList'
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            var list = newVal.List;
                            if (list) {
                                self.NoteList.removeAll();
                                //
                                require(['models/SDForms/SDForm.TapeRecord'], function (tapeLib) {
                                    var options = {
                                        entityID: ko_object().ID(),
                                        entityClassID: objectClassID,
                                        type: self.viewModes.discussions
                                    };
                                    //
                                    ko.utils.arrayForEach(list, function (item) {
                                        self.NoteList.push(new tapeLib.TapeRecord(item, options));
                                    });
                                    self.SortTapeRecord(self.NoteList);
                                    self.NoteList.valueHasMutated();
                                });
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[SDForm.Tape.js, LoadMessages]', 'error');
                                });
                            }
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.Tape.js, LoadMessages]', 'error');
                            });
                        else if (newVal && newVal.Result === 2)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.Tape.js, LoadMessages]', 'error');
                            });
                        else if (newVal && newVal.Result === 3)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.Tape.js, LoadMessages]', 'error');
                            });
                    });
                return d;
            };
            //
            self.AppendScroller = function () {
                var $foundObjects = $(ajaxSelector_load);
                //
                if ($foundObjects.length) {
                    var div = $foundObjects.find('.tabContent');
                    div.unbind('scroll', self.OnScroll);
                    div.bind('scroll', self.OnScroll);
                }
            };
            //
            self.FullListIsLoaded = false;
            self.historyIsLoading = false;
            //
            self.OnScroll = function () {
                if (!self.isHistoryListLoaded())
                    return;
                //
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
                //
                $.when(userD).done(function (user) {
                    self.ajaxControl_load.Ajax($(ajaxSelector_load),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: {
                                'ID': ko_object().ID(),
                                'EntityClassId': objectClassID,
                                'ViewName': user.ViewNameSD,
                                'StartIdx': startIdx ? startIdx : 0,
                                'Count': 15
                            },
                            url: 'sdApi/GetHistory'
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
                                            entityClassID: objectClassID,
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
            self.LoadTimeLine = function () {
                var retD = $.Deferred();
                //
                require(['models/SDForms/SDForm.TimeLine'], function (tlLib) {
                        var data = {
                            'ObjectID': ko_object().ID(),
                            'ObjectClassId': objectClassID
                        };
                        var d = self.ajaxControl_load.Ajax($(ajaxSelector_load),
                            {
                                dataType: "json",
                                method: 'GET',
                                data: data,
                                url: 'sdApi/GetTimeline'
                            },
                            function (newVal) {
                                if (newVal && newVal.Result === 0) {
                                    var tlData = newVal.TimeLine;
                                    //
                                    self.TimeLineControl(new tlLib.ViewModel(tlData, $(ajaxSelector_load).find('.tl-base').selector, self.CanEdit, tabDim_object));
                                }
                                else if (newVal && newVal.Result === 1)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.Tape.js, LoadTimeLine]', 'error');
                                    });
                                else if (newVal && newVal.Result === 2)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.Tape.js, LoadTimeLine]', 'error');
                                    });
                                else if (newVal && newVal.Result === 3)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                    });
                                else
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.Tape.js, LoadTimeLine]', 'error');
                                    });
                            });
                        return d;
                    });
            };
            //
            self.AddNewNote = function () {//добавить новую заметку / сообщение
                if (self.htmlControl == null)
                    return;
                //
                var html = self.htmlControl.GetHTML();
                var isMessage = self.SelectedEditorMode() == self.editMode.note ? 0 : 1;
                //
                if (self.htmlControl.IsEmpty() == true) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('SDNoteIsEmptyCaption'), getTextResource('SDNoteIsEmpty'), 'warning');
                    });
                    //
                    return;
                }
                //
                self.ajaxControl_add.Ajax($(ajaxSelector_add),
                    {
                        dataType: "json",
                        method: 'POST',
                        url: 'sdApi/AddNote',
                        data: {
                            Id: ko_object().ID(),
                            EntityClassId: objectClassID,
                            Message: html,
                            Type: isMessage
                        }
                    },
                    function (model) {
                        if (model.Result === 0) {
                            if (self.htmlControl != null) {
                                self.htmlControl.SetHTML('');
                                self.reloadText(true);
                                set_cookie("SDTapeTextNote", '');
                            }
                            //
                            if (model.Elem) {
                                $(document).trigger('local_objectInserted', [117, model.Elem.ID, ko_object().ID()]); //OBJ_NOTIFICATION ~ SDNote добавление сообщения в списке
                            }
                        }
                        else if (model.Result === 1) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('NullParamsError') + '\n[SDForm.Tape.js, AddNewNote]', 'error');
                            });
                        }
                        else if (model.Result === 2) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('BadParamsError') + '\n[SDForm.Tape.js, AddNewNote]', 'error');
                            });
                        }
                        else if (model.Result === 3) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                            });
                        }
                        else if (model.Result === 8) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('ValidationError'), 'error');
                            });
                        }
                        else {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[SDForm.Tape.js, AddNewNote]', 'error');
                            });
                        }
                    });
            };
            //
            self.TryAddNoteByID = function (id) {//дозагрузка сообщения/заметки
                if (!self.isNoteListLoaded())
                    return;
                //
                var data = {
                    'NoteID': id,
                    'EntityID': ko_object().ID(),
                    'EntityClassId': objectClassID
                };
                self.ajaxControl_load.Ajax($(ajaxSelector_load),
                    {
                        dataType: "json",
                        method: 'GET',
                        data: data,
                        url: 'sdApi/GetNote'
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            if (newVal.Elem && self.isNoteListLoaded() == true)
                                require(['models/SDForms/SDForm.TapeRecord'], function (tapeLib) {
                                    var existed = ko.utils.arrayFirst(self.NoteList(), function (el) {
                                        return el.ID == newVal.Elem.ID;
                                    });
                                    //
                                    if (existed) {
                                        existed.Merge(newVal.Elem);
                                        self.SortTapeRecord(self.NoteList);
                                        self.NoteList.valueHasMutated();
                                    }
                                    else
                                    {
                                        var options = {
                                            entityID: ko_object().ID(),
                                            entityClassID: objectClassID,
                                            type: self.viewModes.discussions
                                        };
                                        self.NoteList.push(new tapeLib.TapeRecord(newVal.Elem, options));
                                        //
                                        if (self.SelectedViewMode().ID == self.viewModes.discussions)
                                            require(['usualForms'], function (module) {
                                                var fh = new module.formHelper();
                                                fh.ScrollTo($(ajaxSelector_load), 'bottom');
                                            });
                                    }
                                });
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.Tape.js, TryAddNoteByID]', 'error');
                            });
                        else if (newVal && newVal.Result === 2)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.Tape.js, TryAddNoteByID]', 'error');
                            });
                        else if (newVal && (newVal.Result == 3 || newVal.Result == 6)) {
                            return;
                        }
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.Tape.js, TryAddNoteByID]', 'error');
                            });
                    });
            };
            //
            self.SetReaded = function (tapeRecord, event) {//прочесть сообщение
                tapeRecord.IsReaded(true);
                self.NoteList.valueHasMutated();
                //
                self.ajaxControl_read.Ajax($(event.target),
                    {
                        dataType: "json",
                        method: 'POST',
                        url: 'sdApi/SetNoteState',
                        data: {
                            EntityClassId: tapeRecord.entityClassID,
                            Id: tapeRecord.entityID,
                            NewState: true,
                            NoteId: tapeRecord.ID
                        }
                    },
                    function (isSuccess) {
                        if (isSuccess === 0) {
                            $(document).trigger('local_objectUpdated', [117, tapeRecord.ID, tapeRecord.entityID]);//OBJ_NOTIFICATION ~ SDNote для обновления данных в списке
                            return;
                        }
                        else if (isSuccess === 2)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('BadParamsError'), 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[SDForm.Tape.js, SetReaded]', 'error');
                            });
                        //
                        tapeRecord.IsReaded(false);
                        self.NoteList.valueHasMutated();
                    });
            };
            //
            self.PromptText = ko.computed(function () {//текст приглашения воода заметки/сообщения
                var editMode = self.SelectedEditorMode();
                //
                if (editMode == self.editMode.message)
                    return getTextResource('AddMessage');
                else if (editMode == self.editMode.note)
                    return getTextResource('AddNote');
                else
                    return '';
            });
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
            self.CreateNoteClick = function () {//создать заметку
                self.reloadText(false);
                self.SelectedEditorMode(self.editMode.note);
                if (self.htmlControl != null) 
                    self.htmlControl.Focus();
                
            };
            self.CreateMessageClick = function () {//создать сообщение
                self.reloadText(false);
                self.SelectedEditorMode(self.editMode.message);
                if (self.htmlControl != null)
                    self.htmlControl.Focus();
            };
            self.CloseClick = function () {//закрыть контрол ввода текста
                self.SelectedEditorMode(self.editMode.none);
            };
            self.onMouseOver = function (obj, event) {//прочитать сообщение при поднесении мыши
                if (obj.Type() == self.viewModes.discussions && !obj.IsReaded())
                    self.SetReaded(obj, event);
            };
            //
            self.HaveUnreaded = ko.observable(false);//есть непрочтенные текущим пользователем сообщения
            self.UnreadNoteCount = ko.computed(function () {//количество непрочтенных сообщений/заметок или по полям объекта, или по данным загруженного списка
                var count = 0;
                var unreadCount = 0;
                //
                if (self.isNoteListLoaded()) {
                    count = self.NoteList().length;
                    ko.utils.arrayForEach(self.NoteList(), function (el) {
                        if (!el.IsReaded())
                            unreadCount++;
                    });
                }
                else if (ko_object != null && ko_object() != null) {
                    unreadCount = ko_object().UnreadNoteCount();
                    if (self.CanViewNotes() == false)
                        count = ko_object().MessageCount();
                    else
                        count = ko_object().TotalNotesCount();
                }
                //
                if (unreadCount > 0)
                    self.HaveUnreaded(true);
                else
                    self.HaveUnreaded(false);
                //
                if (count <= 0)
                    return null;
                if (count > 99)
                    return '99';
                else
                    return '' + count;
            });
            //
            self.EditPanelHeight = ko.observable(0);//высота панели редактирования текста
            self.RefreshEditParenlSize = function () {//перерасчет высоты контрола для ввода и редактирования текста
                if (self.SelectedEditorMode() == self.editMode.none)
                    self.EditPanelHeight(0);
                else {
                    var tmp = $(ajaxSelector_add).find('.tape__editor')[0];
                    if (tmp.scrollHeight) {
                        var height = tmp.scrollHeight;
                        if (height == 0) {
                            setTimeout(self.RefreshEditParenlSize, 100);
                            return;
                        }
                        self.EditPanelHeight(height);
                    }
                }
            };
            //
            self.IsUserListVisible = ko.observable(false);
            self.ToggleUserList = function () {
                self.IsUserListVisible(!self.IsUserListVisible());
                self.CalculateTopPosition();
            };
            //
            self.BottomTabContent = ko.computed(function () {
                if (self.SelectedViewMode().ID == self.viewModes.discussions && readOnly_object() == false)
                {
                    var bot = self.EditPanelHeight() + (self.SelectedEditorMode() == self.editMode.none ? 51 : 112);
                    return bot + 'px';
                }
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
                if (self.SelectedViewMode().ID == self.viewModes.discussions) {
                    var top = self.IsUserListVisible() ? $(ajaxSelector_load).find('.tape__users').outerHeight(true) : 0;
                    top += $(ajaxSelector_load).find('.tape__users__title').outerHeight(true);
                    top += $(ajaxSelector_load).find('.tape_combobox').outerHeight(true);
                    if (top == 0) {
                        resetInterval();
                        setTimeout(function () { self.CalculateTopPosition(); }, 100);
                        return top;
                    }
                    //
                    self.TopTabContent(top + 'px');
                    //
                    if (fromInterval !== true) {
                        resetInterval();
                        self.IntervalUpdateTop = setInterval(function () {
                            var top2 = self.CalculateTopPosition(true);
                            self.CountCheckTopSize++;
                            //
                            if (top2 == top) {
                                self.CountCheckSameSize++;
                            }
                            //
                            if (self.CountCheckSameSize >= 5)
                                resetInterval();
                            //
                            if (self.CountCheckTopSize >= 20)
                                resetInterval();
                        }, 100);
                    }
                    return top;
                }
                else {
                    resetInterval();
                    var top = 45;
                    self.TopTabContent(top + 'px');
                    return top;
                }
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