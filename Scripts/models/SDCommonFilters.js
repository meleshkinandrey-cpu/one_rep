define(['knockout', 'jquery', 'tooltipControl'], function (ko, $, tclib) {
    var module = {
        ViewModel: function () {
            var self = this;
            //
            var filter = function (id, num, name) {
                this.Name = ko.observable(name);
                this.Number = ko.observable(num);
                this.Id = ko.observable(id);
                //
                this.deleteFilter = function () {

                };
                this.editFilter = function () {
                    console.log('edit ' + this.Name());
                };
            };
            //
            self.tableModel = null; //модель таблицы, которой управляем
            //
            self.filterMode = ko.observable(true);//сохраненные или новый
            self.currentModeName = ko.computed(function () {
                return self.filterMode() ? getTextResource('FilterModeSaved') : getTextResource('FilterModeCustom');
            });
            self.switchModeName = ko.computed(function () {
                return self.filterMode() ? getTextResource('FilterModeCustom') : getTextResource('FilterModeSaved');
            });
            self.Switchero = function () {
                var curr = self.filterMode();
                self.filterMode(!curr);
            };
            //
            self.filterList = ko.observableArray([]);
            self.currentFilter = ko.observable();
            //
            self.Load = function () {
                var returnD = $.Deferred();
                self.filterList.removeAll();
                $.ajax({
                    dataType: "json",
                    method: 'GET',
                    url: 'sdcommonapi/filters?'
                }).done(function (newData) {
                    newData.forEach(function (el) {
                        self.filterList().push(new filter(el.Id, el.Number, el.Name));
                    });
                    self.Updated();
                    //
                    self.SortArray();
                    //
                    self.filterList.valueHasMutated();
                    returnD.resolve();
                }).fail(function () {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError'), 'error');
                    });
                });
                return returnD.promise();
            };
            //
            self.SyncSave = null; //следим за обновлениями
            self.Updated = function () {
                var d = $.Deferred();
                self.SyncSave = d;
                setTimeout(function () {
                    if (d === self.SyncSave) {
                        //self.Save();
                        if (self.SyncSave)
                            self.SyncSave.resolve();
                    }
                }, 500);
                return d.promise();
            };
            //
            self.SortArray = function () {
                self.filterList.sort(
                    function (left, right) {
                        return left.Number() == right.Number() ? 0 : (left.Number() < right.Number() ? -1 : 1);
                    }
                );
            }
            //
            self.HideShow = function (ob) {
                $('.x-window-group1:not(.b-content-table__filter)').hide();
                $('.b-content-table__filter').toggle();
            };
            self.AfterRender = function () {
                var new_pos = $(".b-content-table__icon4").outerHeight(true) + $(".b-content-table__icon4").offset().top;
                $(".b-content-table__filter").css("top", new_pos + "px");
                require(['jCustomScrollBar'], function () {
                    $('.b-content-table__filter-container').mCustomScrollbar({
                        axis: "y",
                        theme: "dark-thin",
                        scrollButtons: { enable: true }
                    });
                });
                //
                var ttcontrol = new tclib.control();
                ttcontrol.init($('#filterButtonID'), { text: getTextResource('Filters') });
            };
        }
     }
    return module;
});