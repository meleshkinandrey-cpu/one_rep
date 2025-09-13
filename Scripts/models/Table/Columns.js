define(['knockout', 'jquery', 'ttControl', 'ajax'], function (ko, $, tclib, ajaxLib) {
    var module = {
        ViewModel: function (tableModel, $regionColumnsPanel, $regionColumnsButton, $regionWorkspace) {
            var self = this;
            self.columnList = tableModel.columnList;
            //
            var column = function (obj) {
                var thisObj = this;
                //
                thisObj.UserID = obj.UserID;
                thisObj.ListName = obj.ListName;
                thisObj.MemberName = obj.MemberName;
                thisObj.Order = ko.observable(obj.Order);
                thisObj.Width = ko.observable(obj.Width);
                thisObj.Visible = ko.observable(obj.Visible);
                thisObj.SortAsc = ko.observable(obj.SortAsc);
                thisObj.Text = obj.Text;
                //
                thisObj.showUp = ko.observable(true);
                thisObj.showDown = ko.observable(true);
                //
                thisObj.showResizeThumb = ko.observable(false);
                thisObj.enableResizeThumb = function (m, e) {
                    thisObj.showResizeThumb(true);
                };
                thisObj.disableResizeThumb = function (m, e) {
                    thisObj.showResizeThumb(false);
                };
                //               
                thisObj.ToDTL = function () {
                    return {
                        UserID: thisObj.UserID,
                        ListName: thisObj.ListName,
                        MemberName: thisObj.MemberName,
                        Order: thisObj.Order(),
                        Width: thisObj.Width(),
                        Visible: thisObj.Visible(),
                        SortAsc: thisObj.SortAsc(),
                        Text: thisObj.Text
                    };
                };
                //
                thisObj.Width.subscribe(function (newValue) {
                    self.SaveColumns();
                });
                thisObj.Visible.subscribe(function (newValue) {
                    if (newValue == false) {
                        var allHidden = true;
                        ko.utils.arrayForEach(self.columnList(), function (column) {
                            if (column.Visible() == true)
                                allHidden = false;
                        });
                        //
                        if (allHidden) {
                            thisObj.Visible(true);
                            return;
                        }
                    }
                    //
                    self.columnList.valueHasMutated();
                    self.SaveColumns();
                });
                //
                thisObj.ColumnClick = function (column, event) {
                    if (column && event.target.className != 'columnResizeThumb' && ((new Date()).getTime() - tableModel.moveThumbCancelTime) > 3000)
                        self.SortRowsByColumn(column);
                };
                //
                thisObj.checkShowTooltip = function (data, event) {
                    if (data && event) {
                        var $thisObj = $(event.currentTarget);
                        var labelElem = $thisObj.find('.columnLabel')[0];
                        //
                        if (labelElem.offsetWidth < labelElem.scrollWidth - 2) {//correction for ie
                            var ttcontrol = new tclib.control();
                            ttcontrol.init($thisObj, { text: thisObj.Text, showImmediat: true });
                        }
                    }
                };
            };
            tableModel.createColumn = function (columnSetting) {
                return new column(columnSetting);
            };
            tableModel.RefreshArrows = function () {
                self.RefreshArrows();
            };
            //           
            self.SortRowsByColumn = function (column) {
                self.columnList().forEach(function (obj) {
                    if (obj == column)
                        obj.SortAsc(obj.SortAsc() ? !obj.SortAsc() : true);
                    else
                        obj.SortAsc(null);
                });
                //
                showSpinner($regionWorkspace.find('.tableScroll')[0]);
                var columnsD = self.SaveColumnsPrivate();
                $.when(columnsD).done(function () {
                    hideSpinner($regionWorkspace.find('.tableScroll')[0]);
                    tableModel.Reload();                    
                });
            };
            //
            self.RefreshArrows = function () {
                if (self.columnList().length > 0) {
                    self.columnList().forEach(function (col) {
                        col.showUp(true);
                        col.showDown(true);
                    });
                    //
                    self.columnList()[0].showUp(false);
                    self.columnList()[self.columnList().length - 1].showDown(false);
                }
            };
            self.SwapColumns = function (first, second) {
                var num1 = self.columnList.indexOf(first);
                var num2 = self.columnList.indexOf(second);
                //
                if (num1 >= 0 && num2 >= 0) {
                    var tmp = self.columnList()[num1];
                    self.columnList()[num1] = self.columnList()[num2];
                    self.columnList()[num2] = tmp;
                    //                    
                    ko.utils.arrayForEach(tableModel.rowList(), function (row) {
                        var cells = row.Cells();
                        if (cells.length > num1 && cells.length > num2) {
                            var tmp = cells[num1];
                            cells[num1] = cells[num2];
                            cells[num2] = tmp;
                            //
                            row.Cells.valueHasMutated();
                        }
                    });
                    tableModel.columnList.valueHasMutated();
                }
                //
                self.RefreshArrows();
            };
            self.MoveDown = function (ob) {
                var curNum = self.columnList().indexOf(ob);
                var nextItem = self.columnList()[curNum + 1];
                //
                ob.Order(ob.Order() + 1);
                nextItem.Order(nextItem.Order() - 1);
                //
                self.SaveColumns();
                self.SwapColumns(ob, nextItem);
            };
            self.MoveUp = function (ob) {
                var curNum = self.columnList().indexOf(ob);
                var prevItem = self.columnList()[curNum - 1];
                //
                ob.Order(ob.Order() - 1);
                prevItem.Order(prevItem.Order() + 1);
                //
                self.SaveColumns();
                self.SwapColumns(prevItem, ob);
            };
            //
            self.syncTimeout = null;
            self.syncD = null;
            self.ajaxControl = new ajaxLib.control();
            self.SaveColumns = function () {
                var d = self.syncD;
                if (d == null || d.state() == 'resolved') {
                    d = $.Deferred();
                    self.syncD = d;
                }
                //
                if (self.syncTimeout)
                    clearTimeout(self.syncTimeout);
                self.syncTimeout = setTimeout(function () {
                    if (d == self.syncD) {
                        $.when(self.SaveColumnsPrivate()).done(function () {
                            d.resolve();
                        });
                    }
                }, 1000);
                //
                return d.promise();
            };
            self.SaveColumnsPrivate = function () {
                var d = $.Deferred();
                //
                var param = [];
                try {
                    self.columnList().forEach(function (obj) {
                        param.push(obj.ToDTL());
                    });
                }
                catch (e) {
                    d.resolve();
                    return d.promise();
                }
                //
                self.ajaxControl.Ajax(null,
                    {
                        url: 'accountApi/SetColumnSettingsList',
                        method: 'POST',
                        data: { '': param }
                    },
                    function (response) {
                        if (response == false) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('AjaxError') + '\n[Column.js, SaveColumnsPrivate]', 'error');
                            });
                        }
                    }).done(function () { d.resolve(); });
                return d.promise();
            };
            //
            self.HidePanel = function () {
                $regionColumnsPanel.find('.b-content-table__settings').hide();
            };
            //
            self.refreshListSize = function () {
                var height = $regionColumnsPanel.find('.b-content-table__settings').height();
                //
                var listHeight = height - $regionColumnsPanel.find('.b-content-table__settings').find(".tableSettingsControl").outerHeight(true);
                $regionColumnsPanel.find(".b-content-table__settings-container").height(listHeight + "px");
            };
            //
            self.AfterRender = function () {
                $(window).resize(function () {
                    self.refreshListSize();
                });                
                if ($regionColumnsButton.length > 0) {
                    var ttcontrol = new tclib.control();
                    ttcontrol.init($regionColumnsButton, { text: getTextResource('ColumnSettings'), side: 'left' });
                    //
                    $regionColumnsButton.click(function (e) {
                        openRegion($regionColumnsPanel.find('.b-content-table__settings'), e);
                    });
                }
            };
        }
    }
    return module;
});