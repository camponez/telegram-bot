var sqlite3 = require('sqlite3').verbose();
var Promise = require('promise');

var db_file = '/cruzeirorss/rss.db';

function update_news() {
    return new Promise(function (resolve, reject) {
        var obj = {
            news: [],
            opts: []
        }
        var db = new sqlite3.Database(db_file);
        db.serialize(function() {
            db.each("select rowid as id, texto from rss where aprovado = 0 order by id;", function (err, row) {
                obj.news.push(row.id + ": " + row.texto);
                obj.opts.push(["/aprovar " + row.id, "/rejeitar " + row.id])

            }, function() {
                resolve(obj);
            });
        });
        db.close();
    });
};

var cmds = [
    '/aprovar NUMERO - Aceitar o artigo',
    '/rejeitar NUMERO - Nega o artigo',
];

const Telegraf = require('telegraf')

const app = new Telegraf(process.env.BOT_TOKEN, {username: 'CruzeiroRss'})

app.command('help', ({ from, reply }) => {
    //console.log('start', from)
    cmds.forEach(function(e,i,a) {
        return reply(e)
    });
})

app.command('start', ({ from, reply }) => {
    //console.log('start', from)
    return reply('Bem vindo! /help para os comandos')
})

function avaliar(ctx, msg_response, status) {
    var msg = ctx.message.text.trim();
    var id = msg.split(' ')[1];
    if (typeof id == 'undefined') {
        return ctx.reply('Número da notícia vazio.');
    }

    var db = new sqlite3.Database(db_file);
    db.run('update rss set aprovado = ? where rowid = ?', [status, id], function() {
        update_news().then(function (obj) {
            return ctx.reply(msg_response + id,
                reply_markup=Telegraf.Markup.keyboard(obj.opts)
                .oneTime()
                .resize()
                .extra(),
                disable_notification = true
            )
        });
    });
    db.close();
}

function list_news() {
    var chan_id = -169305907;
    update_news().then(function (obj) {
        if (obj.news.length == 0) {
            return;
        }

        obj.news.forEach(function(e, i, a) {
            //console.log(e);
            app.telegram.sendMessage(chan_id, e);
        });

        setTimeout(function() {
            app.telegram.sendMessage(chan_id, text="Use o menu para avaliar:",
                reply_markup=Telegraf.Markup.keyboard(obj.opts)
                .oneTime()
                .resize()
                .extra(),
                disable_notification = true
            )}, 2000);

    }).catch(function (err) {
        return ctx.reply(err)
        // TRATAR ERRO... POSSL ERRO DE COM BANCO, POR EXEMPLO
    });
}

app.command('list', (ctx) => {
    list_news()
})

app.command('rejeitar', (ctx) => {
    avaliar(ctx, 'Rejeitou noticia: ', -1);
})

app.command('rejeitar@CruzeiroRssBot', (ctx) => {
    avaliar(ctx, 'Rejeitou noticia: ', -1);
})

app.command('aprovar', (ctx) => {
    avaliar(ctx, 'Aprovou noticia: ', 1);
})

app.command('aprovar@CruzeiroRssBot', (ctx) => {
    avaliar(ctx, 'Aprovou noticia: ', 1);
})

setInterval(list_news, 1000 * 60 * 17);

app.startPolling()

//vim: ts=4:sw=4:expandtab:softtabstop=4:
