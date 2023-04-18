function adminLogin() {
    var e, r = $("#logun")
        .val()
        , a = $("#logpw")
        .val()
        , s = [];
    "" != r && "" != r.replace(/[\s]/g, "") || s.push("Username is required!"), "" != a && "" != a.replace(/[\s]/g, "") || s.push("Password is required!"), e = $("#saveii")
        .is(":checked") ? "yes" : "no", 0 < s.length ? Err(s.join(".<br><br>")) : ((s = {})
            .username = r, s.password = a, s._csrf = "" + csrfx, s.save = e, preloader(1), $.ajax({
                type: "post"
                , url: "/admin"
                , data: s
                , error: function() {
                    preloader(0), Err("a server error occurred. please try again")
                }
                , success: function(e) {
                    e.err ? (preloader(0), Err(e.message)) : e.succ ? window.location = "/admin" : (preloader(0), Err("an unrecognized error occurred. please try again"))
                }
            }))
}