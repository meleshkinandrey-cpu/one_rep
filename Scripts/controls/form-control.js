define(['knockout', 'jquery', 'ajax', 'jqueryUI'], function (ko, $, ajaxLib) {
    var module = {
        //тег-диалога, название настроек, заголовок формы, модальна ли, перемещаема ли, изменяема ли в размерах, ширина минимальная, высота минимальная, кнопки с реакцией, действия после закрытия, дополнительные атрибуты тела
        control: function (regionName, formName, caption, isModal, isDraggable, isResizable, minWidth, minHeight, buttons, afterClose, attrs) {
            var self = this;
            self.Initialized = false;
            //check for duplicates
            if (!$.openedForms)
                $.openedForms = [];
            //
            var formID = regionName + formName;
            if ($.openedForms && isModal) {//declare in main layout
                if ($.openedForms.indexOf(formID) != -1)
                    return;
                else
                    $.openedForms.push(formID);
            }
            //
            regionName = regionName + '_' + ko.getNewID();
            $('#controlsContainer').append('<div id="' + regionName + '"' + attrs + ' style="display:none"></div>');//body of dialog
            //
            //TODO: problem with offsets
            //var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
            //var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;
            self.screenWidth = function () { return window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width; }
            self.screenHeight = function () { return window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height; }
            //
            //defautl size and position
            self.isMaximized = ko.observable(false);
            self.x = Math.max((self.screenWidth() / 2) - (minWidth / 2), 0);
            self.realX = function () { return self.isMaximized() == true ? 0 : self.x; };
            self.y = Math.max((self.screenHeight() / 2) - (minHeight / 2), 0);
            self.realY = function () { return self.isMaximized() == true ? 0 : self.y; };
            self.width = minWidth;
            self.realWidth = function () { return self.isMaximized() == true ? self.screenWidth() : self.width; };
            self.height = minHeight;
            self.realHeight = function () { return self.isMaximized() == true ? self.screenHeight() : self.height; };
            //
            self.settingsChanged = false;
            self.settingsExists = undefined;
            self.settingsD = $.Deferred();
            self.settings = null;
            //
            self.frmCreatedD = $.Deferred();
            self.frmOpenedD = $.Deferred();
            self.maximizeButtonInitialized = false;
            self.frm = null;
            //
            self.ajaxControl_load = new ajaxLib.control();
            self.ajaxControl_save = new ajaxLib.control();
            //

            self.del_cookie=function(name) {
                var cookie_string = name + "=" + escape('');
                document.cookie = cookie_string;
            };
            
            $.when(self.settingsD).done(function () {
                self.frm = $('#' + regionName).dialog({
                    autoOpen: false,
                    draggable: self.isMaximized() == true ? false : isDraggable,
                    resizable: self.isMaximized() == true ? false : isResizable,
                    modal: isModal,
                    minWidth: minWidth,
                    minHeight: minHeight,
                    title: caption,
                    buttons: buttons,
                    closeOnEscape: true,
                    beforeClose: function (event, ui) {
                        if (self.BeforeClose)
                            return self.BeforeClose();
                        return true;
                    },
                    close: function () {
                        self.del_cookie("SDTapeTextNote"); //для чистки cookie из ленты
                        self.saveSettings();
                        self.frm.dialog('destroy').remove();
                        self.frm = null;
                        //
                        if ($.openedForms) {
                            var indexOfForm = $.openedForms.indexOf(formID);
                            if (indexOfForm > -1)
                                $.openedForms.splice(indexOfForm, 1);
                        }
                        //
                        if (isModal) {
                            var $overlay = $('.ui-widget-overlay');
                            $overlay.unbind('click', self.OverlayClick);
                        }
                        //
                        if (afterClose)
                            afterClose();
                    },
                    open: function (event, ui) {
                        self.Opened();
                    },
                    dragStop: function () {
                        if (self.isMaximized() == true)
                            return;
                        //
                        var parentDiv = self.GetDialogDIV();
                        var offset = parentDiv.offset();
                        self.x = offset.left;
                        self.y = offset.top;
                        //
                        self.markSettingsChanged();
                    },
                    resizeStop: function () {
                        if (self.isMaximized() == true)
                            return;
                        //
                        var parentDiv = self.GetDialogDIV();                        
                        self.width = Math.max(minWidth, parentDiv.width());
                        self.height = Math.max(minHeight, parentDiv.height());
                        //
                        var offset = parentDiv.offset();
                        self.x = offset.left;
                        self.y = offset.top;
                        //
                        self.markSettingsChanged();
                    },
                    resize: function (e, p) {
                        if (self.SizeChanged)
                            self.SizeChanged();
                    },
                });
                self.frmCreatedD.resolve();
            });
            //
            //
            self.BindCaption = function (context, dataBindAttr) {
                var parentDiv = self.GetDialogDIV();
                if (parentDiv.length == 0)
                    return false;
                //
                require(['knockout'], function (ko) {
                    var titleDiv = parentDiv.find('.ui-dialog-title');
                    titleDiv.attr('data-bind', dataBindAttr);
                    if (titleDiv.length == 1)
                        try {
                            ko.applyBindings(context, titleDiv[0]);
                        }
                        catch (err) {
                        }
                });
                return true;
            };
            self.ExtendSize = function (contentWidth, contentHeight, ignoreSettings) {
                var retval = $.Deferred();
                $.when(self.settingsD, self.frmOpenedD).done(function () {
                    if (self.settingsExists == true && (!ignoreSettings || ignoreSettings == true) ||
                        self.frm == null ||
                        self.isMaximized() == true) {
                        retval.resolve();
                        return;
                    }
                    //
                    var parentDiv = self.GetDialogDIV();
                    var childTitleDIV = parentDiv.find('.ui-dialog-titlebar');
                    var buttonsDIV = parentDiv.find('.ui-dialog-buttonpane');
                    var dy = (childTitleDIV ? childTitleDIV.outerHeight() : 0) + (buttonsDIV ? buttonsDIV.outerHeight() : 0);
                    //
                    var maxWidth = self.screenWidth() * 0.95;
                    var maxHeight = self.screenHeight() * 0.95;
                    //
                    var newWidth = Math.min(contentWidth, maxWidth);
                    self.x -= (newWidth - self.width) / 2;
                    self.width = newWidth;
                    //
                    var newHeight = Math.min(contentHeight + dy, maxHeight);
                    self.y -= (newHeight - self.height) / 2;
                    self.height = newHeight;
                    //
                    self.frm.dialog({
                        left: self.realX(),
                        top: self.realY(),
                        width: self.realWidth(),
                        height: self.realHeight(),
                        draggable: self.isMaximized() == true ? false : isDraggable,
                        resizable: self.isMaximized() == true ? false : isResizable
                    });
                    self.markSettingsChanged();//for save optimal size in settings
                    self.SizeChanged();
                    retval.resolve();
                });
                return retval.promise();
            };
            self.Show = function () {
                $.when(self.frmCreatedD).done(function () {
                    if (self.frm != null)
                        self.frm.dialog('open');
                });
                //
                return self.frmOpenedD;//onOpened
            };
            self.BeforeClose = undefined;
            self.Close = function () {
                $.when(self.frmOpenedD).done(function () {
                    if (self.frm == null)
                        return;
                    //
                    self.frm.dialog('close');
                });
            };
            self.GetRegionID = function () {
                return regionName;
            };
            self.GetInnerWidth = function () {
                if (self.frm == null)
                    return null;
                //
                var innerWidth = self.GetDialogDIV().width();
                return innerWidth;
            };
            self.GetInnerHeight = function () {
                if (self.frm == null)
                    return null;
                //
                var mainDIV = self.GetDialogDIV();
                var childTitleDIV = mainDIV.find('.ui-dialog-titlebar');
                var buttonsDIV = mainDIV.find('.ui-dialog-buttonpane');
                var innerHeight = mainDIV.height() - (childTitleDIV ? childTitleDIV.outerHeight() : 0) - (buttonsDIV ? buttonsDIV.outerHeight() : 0);
                return Math.max(0, innerHeight);
            };
            //
            self.Maximize = function () {
                $.when(self.frmOpenedD).done(function () {
                    if (self.frm == null)
                        return;
                    //
                    self.isMaximized(!self.isMaximized());
                    self.markSettingsChanged();
                    self.frm.dialog({
                        left: self.realX(),
                        top: self.realY(),
                        width: self.realWidth(),
                        height: self.realHeight(),
                        draggable: self.isMaximized() == true ? false : isDraggable,
                        resizable: self.isMaximized() == true ? false : isResizable
                    });
                    //
                    var parentDiv = self.GetDialogDIV();
                    parentDiv.css('left', self.realX() + 'px');
                    parentDiv.css('top', self.realY() + 'px');
                    parentDiv.css('width', self.realWidth() + 'px');
                    parentDiv.css('height', self.realHeight() + 'px');
                    self.SizeChanged();
                });
            };
            //
            self.Opened = function () {
                var parentDiv = self.GetDialogDIV();
                parentDiv.css('left', self.realX() + 'px');
                parentDiv.css('top', self.realY() + 'px');
                parentDiv.css('width', self.realWidth() + 'px');
                parentDiv.css('height', self.realHeight() + 'px');
                parentDiv.css('background', 'white');
                parentDiv.css('box-shadow', '3px 3px 10px rgba(10,10,10,0.25), -3px -3px 10px rgba(10,10,10,0.25)');
                //
                if (isModal) {
                    var $overlay = $('.ui-widget-overlay');
                    $overlay.addClass('themodal-overlay');
                    //
                    $overlay.bind('click', self.OverlayClick);
                }
                if (caption == null)
                    parentDiv.find('div.ui-dialog-titlebar').remove();
                else if (isResizable == true && self.maximizeButtonInitialized == false) {
                    var captionDiv = self.GetDialogDIV().find('.ui-dialog-titlebar');
                    if (captionDiv.length != 0) {
                        var maximizeDiv = captionDiv.append('<button type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-icon-only ui-dialog-titlebar-maximize" role="button" title="Maximize/Restore" data-bind="click: Maximize, css: {maximize : isMaximized}"><span class="ui-button-icon-maximize ui-icon"></span><span class="ui-button-text">Minimize/Maximize</span></button>');
                        ko.applyBindings(self, maximizeDiv[0]);
                        self.maximizeButtonInitialized = true;
                    }
                }
                //
                self.SizeChanged();
                //
                self.frmOpenedD.resolve();
            };
            self.OverlayClick = function (e) {
                if (closeRegions())
                    return;
                //
                self.Close();
                e.stopPropagation();
            };
            self.SizeChanged = function () {
                if (self.frm == null)
                    return;
                //
                var width = self.GetInnerWidth();
                var height = self.GetInnerHeight();
                $('#' + regionName).css('width', width + 'px');
                $('#' + regionName).css('height', height + 'px');
                //
                $(document).trigger('form_sizeChanged', [width, height]);
            };
            self.LoadSettings = function (newFormName, newMinWidth, newMinHeight, newButtons) {
                var retval = $.Deferred();
                $.when(self.frmOpenedD, self.settingsD).done(function () {
                    var d = self.saveSettings();
                    //
                    if (formName != newFormName)
                        $.when(d).done(function () {
                            self.settingsChanged = false;
                            self.settingsExists = undefined;
                            self.settingsD = $.Deferred();
                            self.settings = null;
                            //
                            formName = newFormName;
                            minWidth = newMinWidth;
                            minHeight = newMinHeight;
                            buttons = newButtons;
                            //
                            self.frm.dialog({
                                minWidth: minWidth,
                                minHeight: minHeight,
                                buttons: buttons
                            });
                            //
                            self.loadSettings();
                            $.when(self.settingsD).done(function () {
                                self.Opened();
                                retval.resolve();
                            });
                        });
                    else
                        retval.resolve();
                });
                //
                return retval;
            };
            //
            self.UpdateButtons = function (newButtons) {
                var retval = $.Deferred();
                $.when(self.frmOpenedD, self.settingsD).done(function () {
                    buttons = newButtons;
                    //
                    self.frm.dialog({
                        minWidth: minWidth,
                        minHeight: minHeight,
                        buttons: buttons
                    });
                    self.Opened();
                    retval.resolve();
                });
                //
                return retval;
            };
            //
            self.GetDialogDIV = function () {
                var parentDiv = $('#' + regionName).parent();
                return parentDiv;
            }
            self.markSettingsChanged = function () {
                self.settingsChanged = true;
            };
            self.loadSettings = function () {
                if (!formName) {
                    self.settingsD.resolve();
                    return;
                }
                self.ajaxControl_load.Ajax(null,
                    {
                        url: 'accountApi/GetFormSettings',
                        method: 'GET',
                        data: { 'formName': formName }
                    },
                    function (response) {
                        if (response) {
                            self.settings = response;
                            //
                            if (response.X != 0 || response.Y != 0 || response.Width != 0 || response.Height != 0) {
                                self.x = response.X;
                                self.y = response.Y;
                                self.width = response.Width <= minWidth ? minWidth : response.Width;
                                self.height = response.Height <= minHeight ? minHeight : response.Height;
                                self.isMaximized(response.Mode == 1);
                                //
                                self.settingsExists = true;
                            } else
                                self.settingsExists = false;
                        }
                        else
                            self.settingsExists = false;
                    }).done(function () { self.settingsD.resolve(); });
            };
            self.saveSettings = function () {
                var retval = $.Deferred();
                if (!self.settingsChanged || !self.settings) {
                    retval.resolve();
                    return retval;
                }
                //
                $.when(self.frmOpenedD, self.settingsD).done(function () {
                    self.settings.X = self.x | 0;
                    self.settings.Y = self.y | 0;
                    self.settings.Width = self.width | 0;
                    self.settings.Height = self.height | 0;
                    self.settings.Mode = self.isMaximized() == true ? 1 : 0;
                    //
                    self.ajaxControl_save.Ajax(null,
                        {
                            url: 'accountApi/SetFormSettings',
                            method: 'POST',
                            dataType: 'json',
                            data: self.settings
                        },
                        function (response) {
                            if (response == false) {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('AjaxError') + '\n[form-control.js, saveSettings]', 'error');
                                });
                            }
                            else {
                                self.settingsChanged = false;
                            }
                            retval.resolve();
                        });
                });
                return retval;
            }
            //
            //
            self.loadSettings();
            self.Initialized = true;
        }
    }
    return module;
});