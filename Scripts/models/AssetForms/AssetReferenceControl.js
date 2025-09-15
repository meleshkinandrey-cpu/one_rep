define(['knockout', 'jquery', 'ajax', 'formControl', 'usualForms', 'ttControl', 'ui_forms/Asset/Controls/AdapterList', 'ui_forms/Asset/Controls/PeripheralList', 'ui_forms/Asset/Controls/PortList', 'ui_forms/Asset/Controls/SlotList', 'ui_forms/Asset/Controls/SoftwareInstallationList'], function (ko, $, ajaxLib, fc, fhModule, tclib, adapterList, peripheralList, portList, slotList, softwareInstallationList) {
    var module = {
        Control: function (ko_object, items, initializeFunc, regionName, getTabSize) {
            var self = this;
            self.IsLoaded = false;
            //
            self.HeaderHeight = 30;
            self.ActionsHeight = 60;
            self.TableHeaderHeight = 30;
            self.HorizontalPadding = 20 + 30;
            //
            self.getTabSize = getTabSize;
            self.getTabHeight = function () {
                return getTabSize().h;
            };
            self.GetResizableContentHeight = function () {
                var h = 0;
                ko.utils.arrayForEach(self.Items, function (item) {
                    if (item.IsExpanded() && item.imList.List().length != 0) {
                        if (item.HasSelectedItems())
                            h += self.ActionsHeight;
                    }
                    if (item.IsExpanded()) {
                        h += item.TableHeaderHeight;
                    }
                });
                //
                return self.getTabHeight() - self.Items.length * self.HeaderHeight - h;
            };
            //
            self.ItemsFullData = items;//списки + названия шаблонов
            self.Items = [];//только списки
            //
            ko.utils.arrayForEach(items, function (item) {
                self.Items.push(item.List);
            });
            //
            self.getDataForList = function (classID) {
                var retval = null;
                ko.utils.arrayForEach(self.Data, function (item) {
                    if (item.m_Item1 == classID)
                        retval =
                            {
                                Data: item.m_Item2,
                                Columns: item.m_Item3,
                            };
                });
                return retval;
            };
            //
            self.getClassList = function () {
                var retval = [];
                ko.utils.arrayForEach(self.Items, function (item) {
                    retval.push(item.ClassID);
                });
                return retval;
            };
            //
            self.Initialize = function () {
                if (!self.IsLoaded)
                    $.when(self.LoadData()).done(function () {
                        $.when(initializeFunc()).done(function () {
                            self.init();
                        });
                    });
            };
            //
            self.Data = null;//данные всех отображаемых списков
            self.ajaxControl = new ajaxLib.control();
            self.LoadData = function () {
                var data = {
                    'ID': ko_object().ID(),
                    'EntityClassID': ko_object().ClassID(),
                    'ReferenceClassList': self.getClassList()
                };
                var retvalD = $.Deferred();
                self.ajaxControl.Ajax($(regionName),
                    {
                        dataType: "json",
                        method: 'GET',
                        data: data,
                        url: 'assetApi/GetDeviceReferenceList'
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            self.Data = newVal.List;
                            ko.utils.arrayForEach(self.Items, function (item) {
                                item.Data = self.getDataForList(item.ClassID);
                            });
                            retvalD.resolve(self.Data);
                        }
                    });
                return retvalD.promise();
            };
            //
            self.GetAvailableHeightObj = function (currItem, isCustomCall, isDecreaseHeight, isDecreasePrevElement) {
                var heightSum = 0;
                ko.utils.arrayForEach(self.Items, function (item) {
                    var height = item.IsExpanded() ? item.Height() : 0;
                    if (item.IsExpanded() && item.HasSelectedItems())
                        height += self.ActionsHeight;
                    if (item.IsExpanded()) {
                        height += item.TableHeaderHeight;
                    }
                    //
                    heightSum += height;
                });
                //
                var tabHeight = self.getTabHeight();
                var availableHeight = Math.max(tabHeight - heightSum - self.Items.length * self.HeaderHeight, 0);//размер (высота) пустого пространства на форме
                var heightObj = { Height: ko.observable(availableHeight) };
                //
                var obj = self.GetAvailableItem(currItem, isDecreaseHeight, isDecreasePrevElement);
                //
                if (!currItem)
                    return heightObj;
                else if (isDecreaseHeight || isDecreasePrevElement)
                    return obj;
                else if (!isCustomCall)
                    return availableHeight !== 0 ? heightObj : obj;
            };
            //
            self.GetAvailableItem = function (usedItem, isDecreaseHeight, isDecreasePrevElement) {
                if (!usedItem)
                    return null;
                //
                var idx = self.Items.indexOf(usedItem);
                var length = self.Items.length;
                //
                if (isDecreasePrevElement) {//уменьшаем высоту вышестоящего элемента
                    for (var i = Math.max(idx - 1, 0) ; i >= 0; i--) {
                        var item = self.Items[i];
                        if (i + 1 < self.Items.length - 1) {
                            var nextItem = self.Items[i + 1];
                            if (nextItem.Delta !== 0 && item.Delta == 0)
                                item.Delta = nextItem.Delta;
                        }
                        //
                        if (item.Height() > 1) {
                            return item;
                        }
                    }
                    return self.Items[0];
                }
                else if (isDecreaseHeight) {//уменьшаем высоту элемента
                    if (usedItem.Height() > 1) {
                        for (var i = idx + 1; i < self.Items.length; i++) {
                            var item = self.Items[i];
                            //
                            if (item.IsExpanded())
                                return item;
                        }
                    }
                }
                else {//увеличиваем высоту элемента
                    for (var i = idx + 1; i < self.Items.length; i++) {
                        var item = self.Items[i];
                        //
                        if (item.IsExpanded() && item.Height() > 1)
                            return item;
                    }
                }
                //
                return { Height: ko.observable(0) };
            };
            //
            self.ResetDelta = function () {
                ko.utils.arrayForEach(self.Items, function (item) {
                    item.Delta = 0;
                });
            };
            //
            self.GetNextItem = function (item) {
                var idx = self.Items.indexOf(item);
                var length = self.Items.length;
                var nextItem = idx + 1 < length ? self.Items[idx + 1] : null;
                //
                return nextItem;
            };
            //
            self.GetOtherItem = function (item) {
                if (self.Items.length != 2)
                    return null;
                //
                var idx = self.Items.indexOf(item);
                if (idx === 0)
                    return self.Items[1];
                else
                    return self.Items[0];
            };
            //
            self.InitializeItemsHeight = function () {
                var notEmptyListCount = 0;
                var tableHeaderHeightSum = 0;
                //
                ko.utils.arrayForEach(self.Items, function (item) {
                    if (item.imList.List().length != 0) {
                        notEmptyListCount++;
                        tableHeaderHeightSum += item.TableHeaderHeight;
                    }
                });
                //
                var totalListCount = self.Items.length;
                //
                var tabHeight = self.getTabHeight();
                var availableHeight = tabHeight - totalListCount * self.HeaderHeight - tableHeaderHeightSum;
                //
                var height = availableHeight / notEmptyListCount;
                //
                ko.utils.arrayForEach(self.Items, function (item) {
                    if (item.imList.List().length != 0)
                    {
                        item.IsExpanded(true);
                        item.Height(height);
                        item.HeightCoeff = height / availableHeight;
                    }
                });
            };
            //
            self.ResetHeightCoeffs = function () {
                ko.utils.arrayForEach(self.Items, function (item) {
                    if (item.IsExpanded() && item.imList.List().length != 0) {
                        item.HeightCoeff = item.Height() / self.GetResizableContentHeight();
                    }
                    else
                        item.HeightCoeff = 0;
                });
            };
            //
            self.ResetHeight = function () {
                var tabHeight = self.GetResizableContentHeight();
                //
                ko.utils.arrayForEach(self.Items, function (item) {
                    if (item.IsExpanded() && item.imList.List().length != 0) {
                        var height = item.HeightCoeff * tabHeight;
                        item.Height(height);
                    }
                });
            };
            //
            self.ExpandedItemsCount = function () {
                var retval = 0;
                ko.utils.arrayForEach(self.Items, function (item) {
                    if (item.IsExpanded()) {
                        retval++;
                    }
                });
                return retval;
            };
            //
            self.init = function () {
                ko.utils.arrayForEach(self.Items, function (item) {
                    item.Controller = self;
                    if (item.Init) 
                        item.Init();
                });
                //
                self.InitializeItemsHeight();
                //
                self.IsLoaded = true;
            };
        }
    };
    return module;
});