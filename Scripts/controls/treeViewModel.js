define(['knockout', 'jquery'], function (ko, $) {
    var module = {
        TreeViewEvents: {
            onNodeAdded: 1,
            onDataLoaded: 2,
        },
        TreeViewModelBase: function (dataProvider, nodeViewModel, options) {
            var self = this;

            // common tree node interface
            { 
                self.nodes = ko.observableArray();
                self.dataBound = function () {
                    return false;
                };
                self.parent = null;
                self.visible = ko.observable(true);
            }

            // control interface
            {
                self.selectedNode = ko.observable(null);
                self.load = function () {
                    var promise = dataProvider.getRoots();
                    $.when(promise).done(function (list) {
                        self._setNodes(self, list);
                        raiseCallback(module.TreeViewEvents.onDataLoaded, {});
                    });
                };
            }           

            // mapping configuration
            {
                var defaults = {
                    id: 'ID',
                    text: 'Name',
                    classId: 'ClassID',
                    iconCss: 'IconClass',
                    partiallyChecked: 'PartiallySelected'
                };
                self.config = $.extend({}, defaults, options);
            }

            // private methods
            {
                self._setNodes = function (root, list) {
                    root.nodes.removeAll();
                    ko.utils.arrayForEach(list, function (item) {
                        var node = new nodeViewModel(item, root, self.config);

                        node.selected.subscribe(function (selected) {
                            if (selected) {
                                var currentNode = self.selectedNode();
                                self.selectedNode(node);

                                if (currentNode) {
                                    currentNode.selected(false);
                                }
                            }
                        });
                        self._nodeAdding(node);
                        self.executeFilter(node);

                        root.nodes.push(node);

                        raiseCallback(module.TreeViewEvents.onNodeAdded, { node: node });
                    });
                };
                self._nodeAdding = function (node) {
                    // override this method to add logic after node is added into tree
                };
            }

            // events
            {
                var subscribers = {};
                subscribers[module.TreeViewEvents.onDataLoaded] = [];
                subscribers[module.TreeViewEvents.onNodeAdded] = [];

                function raiseCallback(eventId, args) {
                    ko.utils.arrayForEach(subscribers[eventId], function (subscriber) {
                        subscriber(self, args);
                    })
                }

                self.subscribe = function (eventId, subscriber) {
                    if (!subscribers[eventId]) {
                        throw {
                            message: "Событие (" + eventId + ") не поддерживается!"
                        };
                    }

                    if (typeof subscriber !== "function") {
                        throw {
                            message: "Некорректный подписчик"
                        }
                    }

                    subscribers[eventId].push(subscriber);
                };
            }

            // filter
            {
                var nodeFilter = function () { return true; };
                self.applyFilter = function (filter) {
                    nodeFilter = filter;
                    self.executeFilter();
                };
                self.executeFilter = function (root) {
                    if (root) {
                        var count = self.count(nodeFilter, root);

                        root.visible(nodeFilter(root) || count > 0);
                    }

                    if (root && !root.visible()) {
                        return;
                    }

                    ko.utils.arrayForEach((root || self).nodes(), self.executeFilter);
                };
            }

            // helpers
            {
                self.forEachNode = function (action, root) {
                    ko.utils.arrayForEach((root || self).nodes(), function (node) {
                        action(node);
                        self.forEachNode(action, node);
                    });
                };
                self.collapseAll = function () {
                    self.forEachNode(function (node) { node.expanded(false); });
                };
                self.count = function (filter, root) {
                    var count = 0;
                    self.forEachNode(function (node) {
                        if (filter(node)) {
                            count++;
                        }
                    }, root);

                    return count;
                }
            }
        },
        LazyLoadingTreeViewModel: function (dataProvider, nodeViewModel, options) {
            var self = this;

            module.TreeViewModelBase.call(self, dataProvider, nodeViewModel, options);

            // overrides
            {
                self._nodeAdding = function (node) {
                    node.expanded.subscribe(function () {
                        if (node.expandable() && node.nodes().length === 0) {
                            self.loadChildNodes(node);
                         }
                    });                    
                };
            }

            // load child nodes
            {
                self.loadChildNodes = function (node) {
                    var promise = dataProvider.getChildrenOf(node);
                    $.when(promise).done(function (list) {
                        self._setNodes(node, list);
                        node.expandable(list.length > 0);
                    });
                };
            }
        },
        MultiSelectTreeViewModel: function (baseTreeViewModel, dataProvider, nodeViewModel, checkboxViewModel, options) {
            var self = this;
            baseTreeViewModel.call(self, dataProvider, nodeViewModel, options);

            // edit 
            {
                function uncheckAll(node) {
                    ko.utils.arrayForEach(
                        (node || self).nodes(),
                        function (node) {
                            node.checkbox.uncheck();
                        });
                };

                self.readonly = ko.observable(false);
                self.readonly.subscribe(function (readonly) {
                    self.forEachNode(function (node) {
                        node.checkbox.readonly(readonly);
                    });
                });
            }

            // checkboxes data source
            {
                var data = {};
                function tryGetCheckStateFromData(node) {
                    if (!data[node.classId]) {
                        return;
                    }

                    var dataItem = data[node.classId][node.id];

                    if (!dataItem) {
                        return;
                    }

                    if (dataItem[self.config.partiallyChecked]) {
                        node.checkbox.checkPartially();
                    } else {
                        node.checkbox.check();
                    }
                };

                self.setData = function (items) {
                    data = {};
                    uncheckAll();
                    ko.utils.arrayForEach(items, function (item) {
                        data[item[self.config.classId]] = data[item[self.config.classId]] || {};
                        data[item[self.config.classId]][item[self.config.id]] = item;
                    });
                    self.forEachNode(function (node) {
                        if (node.checkbox.isUnchecked()) {
                            tryGetCheckStateFromData(node);
                        }
                    });
                }

                function getCheckedNodes(root) {
                    var result = [];

                    if (root.dataBound() && root.checkbox.isChecked()) {
                        var data = {};
                        data[self.config.id] = root.id;
                        data[self.config.classId] = root.classId;

                        return [data];
                    } else if (!root.dataBound() || root.checkbox.isPartiallyChecked()) {
                        ko.utils.arrayForEach(root.nodes(), function (node) {
                            result = result.concat(getCheckedNodes(node));
                        });
                    }

                    return result;
                }
                self.getData = function () {
                    return getCheckedNodes(self);
                }
            }

            // overrides
            {
                var baseNodeAdding = self._nodeAdding;
                self._nodeAdding = function (node) { // extend node by attaching a checkbox viewmodel 
                    baseNodeAdding(node);
                    node.checkbox = new checkboxViewModel(self.readonly());

                    if (node.parent.dataBound() // parent is a data node
                        && (node.parent.checkbox.isChecked() || node.parent.checkbox.isUnchecked())) {
                        node.checkbox.copyState(node.parent.checkbox);
                    } else {
                        tryGetCheckStateFromData(node);
                    }

                    node.checkbox.subscribe(function () {
                        self.nodeCheckStateChanged(node);
                    });

                    return node;
                };
            }

            // parent / child checkboxes relations
            {
                self.nodeCheckStateChanged = function (node) {
                    if (node.parent.id) { // recalculate parent check state
                        self.determineParentNodeCheckState(node.parent);
                    }

                    if (!node.checkbox.isPartiallyChecked()) { // change child nodes states
                        var checked = node.checkbox.isChecked();
                        ko.utils.arrayForEach(node.nodes(), function (child) {
                            if (checked) {
                                child.checkbox.check();
                            } else {
                                child.checkbox.uncheck();
                            }
                        });
                    }

                    self.executeFilter(node);
                };
                self.determineParentNodeCheckState = function (root) {
                    if (root.nodes().length === 0 || !root.checkbox) {
                        return;
                    }

                    if (root.nodes().length === ko.utils.arrayFilter(root.nodes(), function (node) { return node.checkbox.isChecked(); }).length) {
                        root.checkbox.check();
                    } else if (root.nodes().length === ko.utils.arrayFilter(root.nodes(), function (node) { return node.checkbox.isUnchecked(); }).length) {
                        root.checkbox.uncheck();
                    } else {
                        root.checkbox.checkPartially();
                    }
                };
            }
        },
        DataNodeViewModel: function (dataItem, parent, config) {
            var self = this;

            // common tree node interface
            {
                self.nodes = ko.observableArray();
                self.dataBound = function () { return true; };
                self.parent = parent;
                self.visible = ko.observable(parent.visible());
                parent.visible.subscribe(function (visible) {
                    self.visible(visible); // hide children if parent is hidden
                });

                if (parent.dataBound()) {
                    self.visible.subscribe(function (visible) {
                        if (visible) {
                            self.parent.visible(true); // unhide parent if any child is set visible
                            self.parent.expandable(true);
                        } else if (ko.utils.arrayFilter(self.parent.nodes(), function (node) { return node.visible(); }).length === 0 && self.parent.dataBound()) {
                            self.parent.expandable(false);
                        }
                    });
                }
            }
            
            // node identification
            { 
                self.id = dataItem[config.id];
                self.classId = dataItem[config.classId]; // {id, classId} identifies node in datasource 
                self.key = self.classId + '_' + self.id;
            }

            // node visual elements
            {
                self.text = dataItem[config.text];
                self.selected = ko.observable(false);
                self.expanded = ko.observable(false);
                self.expandable = ko.observable(true);

                self.iconCss = ko.pureComputed( // TODO: this should be in a separate control e.g. ClassIcon
                    function () {
                        return dataItem[config.iconCss] + (self.selected() ? " active" : "");
                    });
            }

            // state change
            {
                self.select = function () {
                    self.selected(true);
                    self.expandCollapse();
                };

                self.expandCollapse = function () {
                    if (self.expandable()) {
                        self.expanded(!self.expanded());
                    }
                };
            }
        }
    };

    return module;
});