define(['jquery'], function ($) {
    return {
        init: function () {
            if (typeof userD == 'object')
                $.when(userD).done(function (user) {
                    if (user.HasRoles == true)
                        console.trace('current user has roles');
                });
            //
            if (typeof operationIsGrantedD == 'function')
                $.when(operationIsGrantedD(357)).done(function (result) {
                    if (result == true)
                        console.trace('current user has OPERATION_SD_General_Administrator');
                });
        }
    }
});