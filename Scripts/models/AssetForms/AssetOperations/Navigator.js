define(['knockout', 'jquery', 'ttControl', 'ajax', 'treeControl'], function (ko, $, tclib, ajaxLib, treeLib) {
    var module = {
        ViewModel: function () {
            var self = this;
            //
            self.locationControl = null;
            //
            self.SelectedObjectID = ko.observable();
            self.SelectedObjectClassID = ko.observable();
            self.SelectedObjectName = ko.observable();
            //
            self.InitLocationTree = function (selectedObjectID, selectedObjectClassID) {
                self.locationControl = new treeLib.control();
                var promise = self.locationControl.init($('#regionAccountLocation'), 1, {
                    onClick: self.OnSelectLocation,
                    ShowCheckboxes: false,
                    AvailableClassArray: [29, 101, 1, 2, 3, 4],
                    ClickableClassArray: [29, 3, 4],
                    AllClickable: false,
                    FinishClassArray: [4]
                });
                //
                $.when(promise).done(function () {
                    if (selectedObjectID)
                        $.when(self.locationControl.OpenToNode(selectedObjectID, selectedObjectClassID)).done(function (finalNode) {
                            if (finalNode && finalNode.ID == selectedObjectID) {
                                self.locationControl.SelectNode(finalNode);
                                self.OnSelectLocation(finalNode);
                            }
                        });
                });
            };
            //
            self.ClearSelection = function () {
                if (self.locationControl)
                    self.locationControl.DeselectNode();
            };
            //
            self.OnSelectLocation = function (node) {
                if (node && node.ClassID == 29) {
                    self.SelectedObjectClassID(null);
                    self.SelectedObjectID(null);
                    self.SelectedObjectName('');
                    //
                    if (self.locationControl)
                        self.locationControl.DeselectNode();
                    //
                    return false;
                }
                //
                self.SelectedObjectClassID(node.ClassID);
                self.SelectedObjectID(node.ID);

                var objCategory = '';
                if (node.ClassID == 3)
                    objCategory = 'Комната ';
                else if (node.ClassID == 4)
                    objCategory = 'Шкаф ';

                self.SelectedObjectName(objCategory + node.Name + ', ' + node.Location);
                //
                return true;
            };
            //
            self.AfterRender = function () {
            };
        }
    }
    return module;
});