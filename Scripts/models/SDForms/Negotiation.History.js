define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        //сущность knockout, идентификатор класса сущности, режим клиент заявки, селектор ajax-крутилки для загрузки, селектор ajax-крутилки для отправки, рид онли обсервабл,  можно ли редактировать обсервабл, размеры вкладки обсервабл, список пользователей для отображения обсерв
        ViewModel: function (id, objectClassID, ajaxSelector_load) {
            var self = this;
            //
            //
            self.viewModes = {
                history: 'history',//история
            };
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
            self.TabListUpdated = function () {
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper();
                    fh.ScrollTo($(ajaxSelector_load).find('.tabContent'), 'bottom');
                });
            };
            //
            self.CheckData = function () {//функция загрузки текущего представления   
                var retvalD = $.Deferred();
                if (!self.isHistoryListLoaded()) {
                    $.when(self.LoadHistory()).done(function () {
                        self.isHistoryListLoaded(true);
                        //self.CalculateTopPosition();
                        retvalD.resolve();
                    });
                }
                else
                    retvalD.resolve();
                //
                //self.CalculateTopPosition();
                //
                return retvalD;
            };
            //
            self.ajaxControl_load = new ajaxLib.control();
            self.LoadHistory = function () {//получить всю историю, доступную текущему пользователю
                var d = $.Deferred();
                //
                $.when(userD).done(function (user) {
                    self.ajaxControl_load.Ajax($(ajaxSelector_load),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: {
                                'ID': id,
                                'EntityClassId': objectClassID,
                                'ViewName': user.ViewNameSD
                            },
                            url: 'sdApi/GetHistory'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var list = newVal.List;
                                if (list) {
                                    self.HistoryList.removeAll();
                                    //
                                    require(['models/SDForms/SDForm.TapeRecord'], function (tapeLib) {
                                        var options = {
                                            entityID: id,
                                            entityClassID: objectClassID,
                                            type: self.viewModes.history
                                        };
                                        ko.utils.arrayForEach(list, function (item) {
                                            self.HistoryList.push(new tapeLib.TapeRecord(item, options));
                                        });
                                        self.SortTapeRecord(self.HistoryList);
                                        self.HistoryList.valueHasMutated();
                                    });
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[SDForm.Tape.js, LoadHistory]', 'error');
                                    });
                                }
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.Tape.js, LoadHistory]', 'error');
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.Tape.js, LoadHistory]', 'error');
                                });
                            else if (newVal && newVal.Result === 3)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                });
                            else
                                require(['sweetAlert'], function () {
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
            //
            //   
        }
    };
    return module;
});