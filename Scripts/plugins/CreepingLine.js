define(['jquery'], function ($) {
    return {
        init: function () {
            //example: get creepingLine
            String.prototype.escape = function () {
                var tagsToReplace = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;'
                };
                return this.replace(/[&<>]/g, function (tag) {
                    return tagsToReplace[tag] || tag;
                });
            };
            //
            $.ajax({
                dataType: "json",
                method: 'GET',
                url: 'resourceApi/GetCreepingLineString',
                success: function (str) {
                    if (str && str.length > 0)
                        $('.b-footer').append('<marquee scrollamount="2" behavior="scroll" direction="left" bgcolor="#ffcc00">' + str.escape() + '</marquee>');
                }
            });
        }
    }
});