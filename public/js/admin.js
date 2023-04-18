function menu() {
    $(window)
        .width() < 768 && ($("#sidePane")
            .fadeToggle(200), $("#side")
            .toggleClass("active"))
}

function dbtab(e) {
    cli(), bootbox.hideAll(), "0px" == $("#side")
        .css("left") && (menu(), $("#side")
            .scrollTop(0)), $(".dbtab")
        .each(function() {
            $(this)
                .removeClass("dactive")
        }), $(".tabBtn")
        .each(function() {
            $(this)
                .removeClass("hactive")
        }), $(window)
        .width() <= 768 ? $("#header_main")
        .scrollLeft($("#header_main")
            .scrollLeft() + $("#dbb-" + e)
            .position()
            .left - 50) : $("#header_main")
        .scrollLeft($("#header_main")
            .scrollLeft() + $("#dbb-" + e)
            .position()
            .left), $("#dbb-" + e)
        .addClass("hactive"), $("#dbtab-" + e)
        .addClass("dactive"), 4 == e && $("#supportCount")
        .html("")
}

function downloadLogs() {
    bootbox.prompt({
        title: "Enter PP"
        , inputType: "password"
        , required: !0
        , callback: function(e) {
            e && socket.emit("download_logs", e, function(e) {
                preloader(0), e.succ ? Succ('<a href="' + e.message + '" onclick="bootbox.hideAll()" class="btn btn-success" download>Download</a>') : e.message ? Err(e.message) : Err("An unknown error occured")
            })
        }
    })
}

function addLog() {
    bootbox.prompt({
        title: "write log"
        , inputType: "text"
        , required: !0
        , callback: function(e) {
            var t;
            e && ((t = {})
                .txt = e, bootbox.prompt({
                    title: "Enter PP"
                    , inputType: "password"
                    , required: !0
                    , callback: function(e) {
                        e && (t.pw = e, socket.emit("add_log", t, function(e) {
                            preloader(0), e.succ ? Succ("Log added successfully!") : e.message ? Err(e.message) : Err("An unknown error occured")
                        }))
                    }
                }))
        }
    })
}

function deleteLogs() {
    bootbox.prompt({
        title: "Enter PP"
        , inputType: "password"
        , required: !0
        , callback: function(e) {
            e && socket.emit("delete_logs", e, function(e) {
                preloader(0), e.succ ? Succ("Logs deleted successfully!") : e.message ? Err(e.message) : Err("An unknown error occured")
            })
        }
    })
}
socket.on("admin", function() {
    load_admin();
});
var admin, timex, catt = []
    , subcatt = [];
$(document).ready(function() {
    
});
var songs;
var cax = []
    , gex = []
    , axx = !(admin = {});

    var newsa = 0;
function load_admin() {
    var obj = {};
    obj.username = adminUN;
    socket.emit("load_admin",obj,function(data){
        if(data.processed){
            var len,k;
            /* parse dashboard */
            $("#today").html(data.today);
            $("#month").html(data.month);
            $("#visits").html(data.visits);
            $("#socks").html(data.sockets);
            $("#songlen").html(data.songlen);
            $("#linklen").html(data.linklen);
            $("#emaillen").html(data.emaillen);
            newsa = data.emaillen;

            /* parse songs*/
            len = data.songs.length
            if(len == 0){
                $("#songs").html('<p class="panP grey padtwenty overhide text-center"><i class="fa fa-warning"></i> No projects added yet. click the \'Plus\' button above to add a new project.</p>');
            }
            else{
                songs = data.songs;
                var htm = [];
                k = 1;
                htm.push('<div class="wide horizon table-responsive"><table class="table titi table-bordered table-striped"><tr><th>S/N</th><th>Title</th><th>Artist</th><th>Feats</th><th>Status</th><th>UPC</th><th>ISRC</th><th>R. Date</th><th>Visits</th><th>Clicks</th><th>Cover</th><th>Preview</th><th>Genre</th><th>Tags</th><th>Lyrics</th><th>Action</th></tr>');
                data.songs.forEach(function(s){
                    var ht = '<tr>'+
                    '<td>'+k+'</td>'+
                    '<td>'+s.title+'</td>'+
                    '<td>'+s.main_art+'</td>'+
                    '<td ondblclick="editFeatures('+s.id+')" class="silver-bg">'+s.features+'</td>'+
                    '<td ondblclick="editStatus('+s.id+')" class="silver-bg">'+s.status+'</td>'+
                    '<td ondblclick="editUPC('+s.id+')" class="silver-bg">'+s.upc+'</td>'+
                    '<td ondblclick="editISRC('+s.id+')" class="silver-bg">'+s.isrc+'</td>'+
                    '<td ondblclick="editRDate('+s.id+')" class="silver-bg">'+dateFromTimestamp(s.release_date)+'</td>'+
                    '<td>'+addComs(s.visits)+'</td>'+
                    '<td>'+addComs(s.l_clicks)+'</td>'+
                    '<td><a class="btn btn-xs btn-info" target="_blank" href="'+s.cover_art+'">open</a></td>'+
                    '<td class="silver-bg">';
                    if(s.preview != ""){
                        ht += '<button onclick="audPlay(this)" data-src="'+s.preview+'" class="btn marfive btn-xs btn-info"><i class="fa fa-play"></i></button> ';
                        ht += '<button onclick="deletePreview('+s.id+')" class="btn marfive btn-xs btn-info">delete</button> ';
                    }
                    ht += '<button onclick="editPreview('+s.id+')" class="btn marfive btn-xs btn-info">change</button></td>'+
                    '<td ondblclick="editGenre('+s.id+')" class="silver-bg">'+s.genres+'</td>'+
                    '<td ondblclick="editTags('+s.id+')" class="silver-bg">'+s.tags+'</td>'+
                    '<td class="silver-bg">';
                    if(s.lyrics != ""){
                        ht += '<a class="btn marfive btn-xs btn-info" target="_blank" href="/lyrics/'+s.id+'">open</a> ';
                        ht += '<button onclick="deleteLyrics('+s.id+')" class="btn marfive btn-xs btn-info">delete</button> ';
                    }
                    ht += '<button onclick="editLyrics('+s.id+')" class="btn marfive btn-xs btn-info">change</button></td>'+
                    '<td class="silver-bg"><button onclick="manageLinks('+s.id+')" class="btn marfive btn-xs btn-info">Manage Links</button> <button onclick="deleteProject('+s.id+')" class="btn marfive btn-xs btn-info">delete</button></td>'+
                    '</tr>';
                    htm.push(ht);
                    k++;
                });
                htm.push('</table></div>');
                $("#songs").html(htm.join(""));
            }

            /* parse stores */
            len = data.stores.length;
            if(len == 0){
                $("#stores").html('<p class="panP grey padtwenty overhide text-center"><i class="fa fa-warning"></i> No stores added yet. click the \'Plus\' button above to add a new store.</p>');
            }
            else{
                stores = data.stores;
                var htm = [];
                k=1;
                htm.push('<div class="wide horizon table-responsive"><table class="table titi table-bordered table-striped"><tr><th>S/N</th><th>Name</th><th>Keyword</th><th>Clicks</th><th>Action</th></tr>');
                data.stores.forEach(function(s){
                    var ht = '<tr><td>'+k+'</td><td>'+s.name+'</td><td>'+s.keyword+'</td><td>'+addComs(s.clicks)+'</td><td><button onclick="deleteStore('+s.id+')" class="btn btn-xs btn-danger">delete</button></td></tr>';
                    htm.push(ht);
                    k++;
                });
                htm.push('</table></div>');
                $("#stores").html(htm.join(""));
            }

            /* parse socials */
            len = data.socials.length;
            if(len == 0){
                $("#socials").html('<p class="panP grey padtwenty overhide text-center"><i class="fa fa-warning"></i> No socials added yet. click the \'Plus\' button above to add a new social link.</p>');
            }
            else{
                var htm = [];
                k = 1;
                htm.push('<div class="wide horizon table-responsive"><table class="table titi table-bordered table-striped"><tr><th>S/N</th><th>Name</th><th>Keyword</th><th>Link</th><th>Clicks</th><th>Action</th></tr>');
                data.socials.forEach(function(s){
                    var ht = '<tr><td>'+k+'</td><td>'+s.name+'</td><td><a href="'+s.icon+'" target="_blank" class="btn btn-xs btn-info marfive">open</a></td><td>'+s.keyword+'</td><td>'+s.clicks+'</td><td><button onclick="deleteSocials('+s.id+')" class="btn btn-xs btn-danger marfive">delete</button></td></tr>';
                    htm.push(ht);
                    k++;
                });
                htm.push('</table></div>');
                $("#socials").html(htm.join(""));
            }

        }
        else{

        }
    });
}

function downnews(){
    if(newsa == 0){
        Info("No emails submitted yet! Nothing to download");
    }
    else{
        var htm = '<div class="padten text-center"><a class="btn btn-success" href="/downnews/emails-'+Date.now()+'" onclick="bootbox.hideAll()" download>Download</a></div>';
        dia({title:'Download Emails',html:htm});
    }
}

function addSocial(){
    var s = {};
    bootbox.prompt({
        title:"Type in Keyword",
        required:true,
        inputType:'text',
        callback:function(result){
            if(result){
                s.key = result;
                bootbox.prompt({
                    title:"Type in Name of Social Site",
                    required:true,
                    inputType:'text',
                    callback:function(result){
                        if(result){
                            s.nam = result;
                            bootbox.prompt({
                                title:"Type in link of Social Site",
                                required:true,
                                inputType:'text',
                                callback:function(result){
                                    if(result){
                                        s.lin = result;
                                        socket.emit("Add_new_social_039u8y4grfyur3",s,function(da){
                                            preloader(0);
                                            if(!da.succ){
                                                Err("A server error occurred!");
                                            }
                                            else{
                                                Succ("Social link added!");
                                                load_admin();
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                });
            }
        }
    });
}

function linkToStore(sid){
    var i;
    var lid = false;
    for(i = 0;i<stores.length;i++){
        if(sid == stores[i].id){
            lid = stores[i].keyword + " on " + stores[i].name;
            break;
        }
    }
    return lid;
}

function manageLinks(id){
    if(stores.length == 0){
        Err("Please add stores first");
    }
    else{
        preloader(1);
        socket.emit("admin_fetch_links",id,function(data){
            preloader(0);
            if(!data.succ){
                Err("A server error occurred!");
            }
            else{
                var links = data.message;
                var htm = '<div id="links" class="padten">';
                var ht = [];
                var broken = [];
                links.forEach(function(l){
                    var key = linkToStore(l.store_id);
                    if(key != false){
                        var h = '<p class="panP font14 wide text-left radthree padfive overhide silver-bg dark-grey">'+key+' ('+l.clicks+' clicks) <a class="btn btn-xs btn-default marfive" href="'+l.link+'" target="_blank" ><i class="fa fa-link"></i></a> <button class="btn btn-xs btn-default marfive" onclick="deleteLink('+l.id+','+id+')"><i class="fa fa-trash"></i></button> </p><br>';
                        ht.push(h);
                    }
                    else{
                        broken.push(l.id);
                    }
                });
                if(ht.length != links.length){
                    preloader(1);
                    socket.emit("delete_broken_links",broken.join(","),function(data){
                        preloader(0);
                        if(!data.succ){
                            Err("Some links found to be broken. Fix not successful due to server error. Please try agaun later.");
                        }
                        else{
                            manageLinks(id);
                        }
                    });
                }
                else{
                    var hx;
                    hx = ht.join("");
                    if(ht.length == 0){
                        hx = '<p class="panP font14 grey padten text-center">No links added yet</p>';
                    }
                    htm += hx+'</div><br><button class="btn btn-sm btn-success marten" onclick="addNewLink('+id+')">Add New Link</button>';
                    dia({title:"Manage Links",html:htm});
                }
            }
        });
    }
}

function deleteLink(id,sid){
    bootbox.hideAll();
    Confirm("Are you sure?",function(result){
        if(result){
            preloader(1);
            socket.emit("delete_link_09u84yrtyur4",id,function(data){
                preloader(0);
                if(!data.succ){
                    Err("An unknown server error occurred!");
                }
                else{
                    manageLinks(sid);
                }
            });
        }
        else{
            manageLinks(sid);
        }
    });
}

function deleteProject(id){
    bootbox.hideAll();
    Confirm("Are you sure?",function(result){
        if(result){
            preloader(1);
            socket.emit("delete_project_9u84yrtyur4njenmiop34",id,function(data){
                preloader(0);
                if(!data.succ){
                    Err("An unknown server error occurred!");
                }
                else{
                    Succ("Project deleted!");
                    load_admin();
                }
            });
        }
    });
}

function deleteSocials(id){
    bootbox.hideAll();
    Confirm("Are you sure?",function(result){
        if(result){
            preloader(1);
            socket.emit("delete_socials_9u84yrtyur4njenmiop34",id,function(data){
                preloader(0);
                if(!data.succ){
                    Err("An unknown server error occurred!");
                }
                else{
                    Succ("Social link deleted!");
                    load_admin();
                }
            });
        }
    });
}

function addNewLink(id){
    if(stores.length == 0){
        Err("Please add stores first!");
    }
    else{
        bootbox.hideAll();
        var htm = [];
        stores.forEach(function(st){
            var ht = '<button onclick="addLink('+st.id+')" class="panButton wide silver-bg marfive-b dark-grey radfive overhide">'+st.keyword+' on '+st.name+'</button>';
            htm.push(ht);
        });
        addLink = function(storeid){
            bootbox.hideAll();
            bootbox.prompt({
                title:"Type in link url",
                inputType:"text",
                required:true,
                callback:function(result){
                    if(result){
                        preloader(1);
                        socket.emit("add_link_uhur3yi3",id,storeid,result,function(data){
                            preloader(0);
                            if(!data.succ){
                                Err("Error adding new link!");
                            }
                            else{
                                manageLinks(id);
                            }
                        });
                    }
                }
            });
        }
        dia({title:"Choose store type",html:htm.join("")});
    }
}

function deletePreview(id){
    Confirm("Are you sure?",function(result){
        if(result){
            preloader(1);
            socket.emit("delete_preview_iuyyfr3y8909r8987r442t5",id,function(data){
                preloader(0);
                if(!data.succ){
                    Err("A server error was encountered!");
                }
                else{
                    Succ("Preview deleted!");
                    load_admin();
                }
            });
        }
    });
}

function deleteLyrics(id){
    Confirm("Are you sure?",function(result){
        if(result){
            preloader(1);
            socket.emit("delete_lyrics_iuyyfr3y8909r8987r442t5",id,function(data){
                preloader(0);
                if(!data.succ){
                    Err("A server error was encountered!");
                }
                else{
                    Succ("Lyrics deleted!");
                    load_admin();
                }
            });
        }
    });
}

var i;
function editLyrics(id){
    initUpload({
        title: "Upload new project lyrics(text file)",
        uploadType:"lyrics",
        accept:"plain",
        acceptAttr:"plain/text",
        max:1000000,
        callback:function(data){
            if(!data.succ){
                Err("File could not be uploaded!");
            }
            else{
                preloader(1);
                socket.emit("edit_lyrics_0re9fygvt4hu93504-",data.message,id,function(dat){
                    preloader(0);
                    if(!data.succ){
                        if(data.message){Err(data.message);}
                        else{
                            Err("An unknown server error occurred!")
                        }
                    }
                    else{
                        Succ("Operation Successful!");
                        load_admin();
                    }
                });
            }
        }
    });
}

function editPreview(id){
    initUpload({
        title: "Upload new project preview(audio file)",
        uploadType:"preview",
        accept:"audio",
        acceptAttr:"audio/*",
        max:100000000,
        callback:function(data){
            if(!data.succ){
                Err("File could not be uploaded!");
            }
            else{
                preloader(1);
                var nau = data.message;
                socket.emit("upload_to_cloud",nau,function(dat){
                    if(!dat.succ){
                        preloader(0);
                        Err("File could not be transferred to cloud!");
                    }
                    else{
                        var nax = dat.message;
                        socket.emit("edit_preview_0e8u3gf4y89u84239494",id,nax,function(data){
                            preloader(0);
                            if(!data.succ){Err("A server error occurred!");}
                            else{
                                Succ("Operation Successful!");
                                load_admin();
                            }
                        });
                    }
                });
            }
        }
    })
}
function editRDate(id){
    bootbox.prompt({
        title:'Enter new release date and time. Time is on a 24 hours clock. Format: DD-MM-YYYY HH:MM',
        required:true,
        inputType:'text',
        callback:function(result){
            if(result){
                var rx = /^[0-3]?[0-9]\-[0-1]?[0-9]\-[0-9]{4}\s[0-2]?[0-9]:[0-6]?[0-9]$/;
                var t = 0;
                if(!rx.test(result)){
                    Err("Invalid release date and time. Please follow required format");
                }
                else{
                    var dar = result.split(" ");
                    var dt = dar[0].split("-");
                    var tm = dar[1].split(":");
                    var dd = parseInt(dt[0]);
                    var mm = (parseInt(dt[1]) - 1);
                    var yyyy = parseInt(dt[2]);
                    var hh = parseInt(tm[0]);
                    var mx = parseInt(tm[1]);
                    var d = new Date(yyyy,mm,dd,hh,mx);
                    t = d.getTime();
                    preloader(1);
                    socket.emit("edit_rdate_uhgef73812e79u3yi1ugy",id,t,function(data){
                        preloader(0);
                        if(!data.succ){Err("A server error occurred!");}
                        else{
                            Succ("Operation Successful!");
                            load_admin();
                        }
                    });
                }
            }
        }
    });
}
function editGenre(id){
    var song;
    for(i=0;i<songs.length;i++){
        if(id == songs[i].id){
            song = songs[i];
            break;
        }
    }
    if(song.id){
        bootbox.prompt({
            title:'edit Genre. If multiple, separate each with a comma (,). Maximum of two genres(main, then sub)',
            inputType:'text',
            maxlength:100,
            value:song.genres,
            callback:function(result){
                if(result){
                    var f = result;
                    if(f.split(",").length > 2){
                        Err("Number of genres exceeded");
                    }
                    else{
                        preloader(1);
                        socket.emit("edit_genre_0riu3fhugt4ryvbwq3u4",id,f,function(data){
                            preloader(0);
                            if(!data.succ){Err("A server error occurred!");}
                            else{
                                Succ("Operation Successful!");
                                load_admin();
                            }
                        });
                    }
                }
            }
        });
    }
    else{
        Err("Project not found!");
    }
}
function editTags(id){
    var song;
    for(i=0;i<songs.length;i++){
        if(id == songs[i].id){
            song = songs[i];
            break;
        }
    }
    if(song.id){
        bootbox.prompt({
            title:'edit Tags. If multiple, separate each with a comma (,). Maximum of three',
            inputType:'text',
            maxlength:100,
            value:song.tags,
            callback:function(result){
                if(result){
                    var f = result;
                    if(f.split(",").length > 3){
                        Err("Number of tags exceeded");
                    }
                    else{
                        preloader(1);
                        socket.emit("edit_tags_0riu3fhugt4ryvbwq3u4",id,f,function(data){
                            preloader(0);
                            if(!data.succ){Err("A server error occurred!");}
                            else{
                                Succ("Operation Successful!");
                                load_admin();
                            }
                        });
                    }
                }
            }
        });
    }
    else{
        Err("Project not found!");
    }
}
function editISRC(id){
    var song;
    for(i=0;i<songs.length;i++){
        if(id == songs[i].id){
            song = songs[i];
            break;
        }
    }
    if(song.id){
        bootbox.prompt({
            title:'edit ISRC. Leave \'n\' in input box to clear field',
            inputType:'text',
            maxlength:20,
            value:song.isrc,
            callback:function(result){
                if(result){
                    var f = result;
                    if(f == "n"){f="";}
                    preloader(1);
                    socket.emit("edit_isrc_0riu3fhugt4ryvbwq3u4i",id,f,function(data){
                        preloader(0);
                        if(!data.succ){Err("A server error occurred!");}
                        else{
                            Succ("Operation Successful!");
                            load_admin();
                        }
                    });
                }
            }
        });
    }
    else{
        Err("Project not found!");
    }
}
function editUPC(id){
    var song;
    for(i=0;i<songs.length;i++){
        if(id == songs[i].id){
            song = songs[i];
            break;
        }
    }
    if(song.id){
        bootbox.prompt({
            title:'edit UPC. Leave \'n\' in input box to clear field',
            inputType:'text',
            maxlength:20,
            value:song.upc,
            callback:function(result){
                if(result){
                    var f = result;
                    if(f == "n"){f="";}
                    preloader(1);
                    socket.emit("edit_upc_0riu3fhugt4ryvbwfq3u4i",id,f,function(data){
                        preloader(0);
                        if(!data.succ){Err("A server error occurred!");}
                        else{
                            Succ("Operation Successful!");
                            load_admin();
                        }
                    });
                }
            }
        });
    }
    else{
        Err("Project not found!");
    }
}
function editStatus(id){
    var song;
    for(i=0;i<songs.length;i++){
        if(id == songs[i].id){
            song = songs[i];
            break;
        }
    }
    if(song.id){
        var ns = "private";
        if(song.status == "private"){ns = "public"}
        Confirm("Would you like to make this project "+ns+"?",function(result){
            if(result){
                preloader(1);
                socket.emit("edit_status_43ygui8yu950885389",id,ns,function(data){
                    preloader(0);
                    if(!data.succ){Err("A server error occurred!");}
                    else{
                        Succ("Operation Successful!");
                        load_admin();
                    }
                });
            }
        });
    }
    else{
        Err("Project not found!");
    }
}
function editFeatures(id){
    var song;
    for(i=0;i<songs.length;i++){
        if(id == songs[i].id){
            song = songs[i];
            break;
        }
    }
    if(song.id){
        bootbox.prompt({
            title:'edit Project Features. If multiple, separate each feature with a comma.Leave input box as \'n\' to delete features',
            inputType:'text',
            maxlength:100,
            value:song.features,
            callback:function(result){
                if(result){
                    var f = result;
                    if(f == "n"){f="";}
                    preloader(1);
                    socket.emit("edit_features_ieruh483940",id,f,function(data){
                        preloader(0);
                        if(!data.succ){Err("A server error occurred!");}
                        else{
                            Succ("Operation Successful!");
                            load_admin();
                        }
                    });
                }
            }
        });
    }
    else{
        Err("Project not found!");
    }
}
var stores = [];
function addStore(){
    bootbox.prompt({
        title:"Enter store name",
        inputType:"text",
        required:true,
        callback:function(result){
            if(result){
                var st = {};
                st.name = result;
                bootbox.prompt({
                    title:"Enter store keyword",
                    inputType:"text",
                    required:true,
                    callback:function(result){
                        if(result){
                            st.key = result;
                            preloader(1);
                            socket.emit("add_store",st,function(data){
                                preloader(0);
                                if(!data.succ){
                                    Err("A server side error occurred!");
                                }
                                else{
                                    Succ("Store added!");
                                    load_admin();
                                }
                            });
                        }
                    }
                });
            }
        }
    });
}

function deleteStore(id){
    Confirm("Are you sure you want to delete this store?",function(result){
        if(result){
            preloader(1);
            socket.emit("delete_store",id,function(data){
                preloader(0);
                if(!data.succ){
                    Err("A server side error occurred!");
                }
                else{
                    Succ("Store deleted!");
                    load_admin();
                }
            });
        }
    });
}

var oussie, ousxie, adxz = [];


function addSong(){
    tab("add-song");
    $("#tab-add-song").scrollTop(0);

    
}

function addProject(){
    var erx = [];
    var upc = $("#as-upc").val().replace(/[\s]{2,}/g," ").trim();
    var isr = $("#as-isr").val().replace(/[\s]{2,}/g," ").trim();
    var tit = $("#as-tit").val().replace(/[\s]{2,}/g," ").trim();
    var mar = $("#as-mar").val().replace(/[\s]{2,}/g," ").trim();
    var fea = $("#as-fea").val().replace(/[\s]{2,}/g," ").trim();
    var rdt = $("#as-rdt").val().replace(/[\s]{2,}/g," ").trim();
    var gen = $("#as-gen").val().replace(/[\s]{2,}/g," ").trim();
    var tag = $("#as-tag").val().replace(/[\s]{2,}/g," ").trim();
    var sta = $("#as-sta").val().replace(/[\s]{2,}/g," ").trim();
    var cov = $("#as-cov").attr("data-file");
    var pre = $("#as-pre").attr("data-file");
    var lyr = $("#as-lyr").attr("data-file");
    if(tit == "" || mar == "" || rdt == "" || gen == "" || tag == "" || sta == "" || cov == ""){
        erx.push("All fields with * are required");
    }
    var rx = /^[0-3]?[0-9]\-[0-1]?[0-9]\-[0-9]{4}\s[0-2]?[0-9]:[0-6]?[0-9]$/;
    var t = 0;
    if(!rx.test(rdt)){
        erx.push("Invalid release date and time. Please follow required format");
    }
    else{
        var dar = rdt.split(" ");
        var dt = dar[0].split("-");
        var tm = dar[1].split(":");
        var dd = parseInt(dt[0]);
        var mm = (parseInt(dt[1]) - 1);
        var yyyy = parseInt(dt[2]);
        var hh = parseInt(tm[0]);
        var mx = parseInt(tm[1]);
        var d = new Date(yyyy,mm,dd,hh,mx);
        t = d.getTime();
    }
    if(gen.split(",").length > 2){
        erx.push("Number of genres exceeded");
    }
    if(tag.split(",").length > 3){
        erx.push("Number of tags exceeded");
    }
    if(erx.length > 0){
        Err(erx.join(".<br>"));
    }
    else{
        var obj = {upc:upc,isr:isr,tit:tit,mar:mar,fea:fea,rdt:t,gen:gen,tag:tag,sta:sta,cov:cov,pre:pre,lyr:lyr};
        preloader(1);
        socket.emit("add_project_98654wtedfcvybui7y6",obj,function(data){
            preloader(0);
            if(!data.succ){
                if(data.message){Err(data.message);}
                else{Err('An unknown serverside error occurred.');}
            }
            else{
                Succ("Project added!");
                load_admin();
                $("#as-upc").val("");
                $("#as-isr").val("");
                $("#as-tit").val("");
                $("#as-mar").val(brandxxx);
                $("#as-fea").val("");
                $("#as-rdt").val("");
                $("#as-gen").val("");
                $("#as-tag").val("");
                $("#as-sta").val("");
                $("#as-ups").children().each(function() {
                    $(this).attr("data-file", "");
                    $(this).children().last().children().last().css("color", "#888").removeClass("fa-check").removeClass("fa-warning").addClass("fa-upload");
                });
                cli();
            }
        });
    }
}


function logout() {
    Confirm("are you sure you want to logout?", function(e) {
        e && Confirm("Do you want to remove your account from this device?", function(e) {
            preloader(1), window.location = e ? "/admin_logout/1" : "/admin_logout/0"
        }, !1)
    }, !1)
}

function addSongFile(t) {
    initUpload({
        title: "Upload project files"
        , uploadType: "project"
        , accept: $(t)
            .attr("data-type")
        , acceptAttr: $(t)
            .attr("data-accept")
        , max: Number($(t)
            .attr("data-max"))
        , callback: function(e) {
            e.succ ? ($(t)
                .attr("data-file", e.message), $(t)
                .children()
                .last()
                .children()
                .last()
                .css("color", "#0c0")
                .removeClass("fa-upload")
                .removeClass("fa-warning")
                .addClass("fa-check")) : ($(t)
                .attr("data-file", ""), $(t)
                .children()
                .last()
                .children()
                .last()
                .css("color", "#e00")
                .removeClass("fa-upload")
                .removeClass("fa-check")
                .addClass("fa-warning"))
        }
    })
}
var que, adminPresence = 1;


function sql() {
    bootbox.prompt({
        title: "write query"
        , inputType: "textarea"
        , value: que
        , required: !0
        , callback: function(t) {
            t && (/delete|alter|drop|empty|truncate/gi.test(t) ? Err("You cannot use the keyword alter or delete or drop or empty") : (que = "" + t, bootbox.prompt("enter privilege password", function(e) {
                e && (preloader(1), socket.emit("query", {
                    query: t
                    , password: e
                }, function(t) {
                    preloader(0), t.err ? Err(JSON.stringify(t.message)) : bootbox.confirm('<p class="panP black">Query successful,click ok to show result</p>', function(e) {
                        e && bootbox.alert("RESULT<br><div class='horizon' style='width:100%;overflow:auto;'>" + JSON.stringify(t.message) + "</div>")
                    })
                }))
            })))
        }
    })
}

function updatePass(a) {
    bootbox.prompt({
        title: "Type in new password"
        , inputType: "password"
        , required: !0
        , callback: function(e) {
            var t;
            e && ((t = {})
                .npw = e, bootbox.prompt({
                    title: "Repeat new password"
                    , inputType: "password"
                    , required: !0
                    , callback: function(e) {
                        e && (t.cpw = e, t.npw !== t.cpw ? Err("Passwords do not match!") : bootbox.prompt({
                            title: "Type in your old password to verify the operation."
                            , inputType: "password"
                            , required: !0
                            , callback: function(e) {
                                e && (t.opw = e, t.un = a, preloader(1), socket.emit("change_admin_password", t, function(e) {
                                    preloader(0), e.succ ? Succ("Password changed successfully!") : e.message ? Err(e.message) : Err("An unknown error occurred.")
                                }))
                            }
                        }))
                    }
                }))
        }
    })
}