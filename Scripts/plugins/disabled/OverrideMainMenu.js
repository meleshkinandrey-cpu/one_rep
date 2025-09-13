define(['jquery', 'knockout'], function ($, ko) {
    return {
        init: function () {
            var checkInterval = null;
            var checkMainMenu = function () {
                var mainMenuElement = document.getElementById('mainMenu');
                if (mainMenuElement != null) {
                    clearInterval(checkInterval);
                    checkInterval = null;
                }
                else
                    return;
                //
                var mainMenuModel = ko.dataFor(mainMenuElement);
                if (mainMenuModel) {
                    var buttons = mainMenuModel.blueActionsList();
                    for (var i = 0; i < buttons.length; i++) {
                        var b = buttons[i];
                        if (b.IconClass === 'mainMenuBlueBtn-Create') {
                            var oldClickAction = b.ClickAction;
                            b.ClickAction = function (bModel, e) {//override click
                                $.when(userD).done(function (user) {//wait for currentUser
                                    if (user.HasRoles == false || user.ViewNameSD == 'ClientCallForTable') {//it's client
                                        showSpinner();
                                        setLocation('SD/ServiceCatalogue');
                                        e.stopPropagation();
                                    }
                                    else
                                        oldClickAction(bModel, e);
                                });
                            };
                            break;
                        }
                    }
                }
            };
            checkInterval = setInterval(checkMainMenu, 100);//wait for mainMenu
        }
    }
});