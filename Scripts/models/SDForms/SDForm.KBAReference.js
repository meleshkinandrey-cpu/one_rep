define(['knockout', 'jquery', 'ttControl'], function (ko, $, tclib) {
    var module = {
        KBAReference: function (imList, obj) {
            var nself = this;
            //
            nself.ID = obj.ID;
            nself.Name = '№ ' + obj.Number + ' ' + obj.Name;
        }
    };
    return module;
});