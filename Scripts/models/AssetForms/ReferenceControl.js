define(['knockout', 'jquery', 'ajax', 'formControl', 'usualForms', 'ttControl', 'ui_forms/Asset/Controls/AdapterList', 'ui_forms/Asset/Controls/PeripheralList', 'ui_forms/Asset/Controls/PortList', 'ui_forms/Asset/Controls/SlotList', 'ui_forms/Asset/Controls/SoftwareInstallationList'], function (ko, $, ajaxLib, fc, fhModule, tclib, adapterList, peripheralList, portList, slotList, softwareInstallationList) {
    var module = {
        Control: function (items, getTabSize) {
            var self = this;
            //
            self.HeaderHeight = 30 + 5;//header height + splitter height
            //
            self.getTabHeight = function () {
                return getTabSize().h;
            };
            self.GetResizableContentHeight = function () {
                return self.getTabHeight() - self.Items.length * self.HeaderHeight;
            };
            //
            self.ItemsFullData = items;//списки + названия шаблонов
            self.Items = [];//только списки
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
                var totalListCount = self.Items.length;
                //
                var tabHeight = self.getTabHeight();
                var availableHeight = tabHeight - totalListCount * self.HeaderHeight;
                //
                var height = availableHeight / totalListCount;
                //
                ko.utils.arrayForEach(self.Items, function (item) {
                    item.Height(height);
                    item.HeightCoeff = height / availableHeight;
                });
            };
            //
            self.ResetHeightCoeff = function (item) {
                if (item.IsExpanded()) {
                    item.HeightCoeff = item.Height() / self.GetResizableContentHeight();
                }
                else
                    item.HeightCoeff = 0;
            };
            //
            self.ResetHeightCoeffs = function () {
                ko.utils.arrayForEach(self.Items, function (item) {
                    self.ResetHeightCoeff(item);
                });
            };
            //
            self.ResetHeight = function () {
                var tabHeight = self.GetResizableContentHeight();
                //
                ko.utils.arrayForEach(self.Items, function (item) {
                    if (item.IsExpanded() && item.listView) {
                        var height = item.HeightCoeff * tabHeight;
                        item.Height(height);
                        if (item.listView)
                            item.listView.waitAndRenderTable();
                    }
                });
            };
            //
            self.ExpandCollapseClick = function (item) {
                item.IsExpanded(!item.IsExpanded());
                //
                var other = self.GetOtherItem(item);
                var h = self.GetResizableContentHeight();
                if (item.IsExpanded()) {
                    item.Height(other.IsExpanded() ? h / 2 : h);
                    other.Height(other.IsExpanded() ? h / 2 : 0);
                }
                else {
                    item.Height(0);
                    other.Height(h);
                }
                self.ResetHeightCoeffs();
                //
                if (item.listView)
                    item.listView.waitAndRenderTable();
                if (other.listView)
                    other.listView.waitAndRenderTable();
            };
            //
            {//initialize
                ko.utils.arrayForEach(items, function (item) {
                    self.Items.push(item.List);
                });
                //
                ko.utils.arrayForEach(items, function (item) {
                    item.List.Controller(self);
                });
            }
        }
    };
    return module;
});