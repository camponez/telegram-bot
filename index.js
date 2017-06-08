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
    '/list - Lista todos disponíveis para analise'
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

function rejeitar(ctx) {
    var msg = ctx.message.text.trim();
    var id = msg.split(' ')[1];
    if (typeof id == 'undefined') {
        return ctx.reply('Número da notícia vazio.');
    }
    console.log(ctx.from, 'Rejeitou notícia: ', id)
    var db = new sqlite3.Database(db_file);
    db.run('update rss set aprovado = ? where rowid = ?', [-1, id], function() {
        update_news().then(function (obj) {
            return ctx.reply('Rejeitou notícia: ' + id,
                reply_markup=Telegraf.Markup.keyboard(obj.opts)
                .oneTime()
                .resize()
                .extra(),
                disable_notification = true
            )
        })
    });
    db.close();
}

app.command('rejeitar', (ctx) => {
    rejeitar(ctx);
})

app.command('rejeitar@CruzeiroRssBot', (ctx) => {
    rejeitar(ctx);
})

function aprovar(ctx) {
    var msg = ctx.message.text.trim();
    var id = msg.split(' ')[1];
    if (typeof id == 'undefined') {
        return ctx.reply('Número da notícia vazio.');
    }
    console.log(ctx.from, 'Aceitou notícia: ', id)
    var db = new sqlite3.Database(db_file);
    db.run('update rss set aprovado = ? where rowid = ?', [1, id], function() {
        update_news().then(function (obj) {
            return ctx.reply('Aprovou notícia: ' + id,
                reply_markup=Telegraf.Markup.keyboard(obj.opts)
                .oneTime()
                .resize()
                .extra(),
                disable_notification = true
            )
        })
    });
    db.close();
}

app.command('aprovar', (ctx) => {
    aprovar(ctx);
})

app.command('aprovar@CruzeiroRssBot', (ctx) => {
    aprovar(ctx);
})

function list_news(ctx) {
    update_news().then(function (news) {
        if (news.length == 0) {
            return ctx.reply('Não existem notícias na fila!');
        } else {
            news.forEach(function(e, i, a) {
                //console.log(e);
                return ctx.reply(e)
            });
        }
    }).catch(function (err) {
        return ctx.reply(err)
        // TRATAR ERRO... POSSL ERRO DE COM BANCO, POR EXEMPLO
    });
}

app.command('list', (ctx) => {
    list_news(ctx)
});

app.command('list@CruzeiroRssBot', (ctx) => {
    list_news(ctx)
});

function send_news() {
    update_news().then(function (obj) {
        obj.news.forEach(function(e, i, a) {
            //console.log(e);
            app.telegram.sendMessage(-169305907, e);
        });

        setTimeout(function() {
    app.telegram.sendMessage(-169305907, text="Use o menu para avaliar:",
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

setInterval(send_news, 1000 * 60 * 17);

app.on('sticker', (ctx) => ctx.reply('👍'))
app.startPolling()

//vim: ts=4:sw=4:expandtab:softtabstop=4:
