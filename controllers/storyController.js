const path = require('path');

const htmlPath = path.join(__dirname, '../views/public/html');

const storyController = {
    getIndex: (req, res) => res.render('index'),
    createChapter: (req, res) => res.render('New_chapter'),
    getLibrary: (req, res) => res.render('Library'),
    getDetailStory: (req, res) => res.render('Detail_story'),
    getNewStory: (req, res) => res.render('New_story'),
    getEditStory: (req, res) => res.render('Edit_story', { storyId: req.query.id }),
    getChapter: (req, res) => res.render('Chapter'),
    getMyStory: (req, res) => res.render('My_story'),
    getLogin: (req, res) => res.render('login'),
    getRegister: (req, res) => res.render('register'),
    getAccount: (req, res) => res.render('Account'),
    getEditChapter: (req, res) => res.render('Edit_chapter'),
    getSearch: (req, res) => res.render('Search_result'),
    getCategory: (req, res) => res.render('Category'),
    getUserProfile: (req, res) => res.render('Account'),

    handleNotFound: (req, res) => {
        res.status(404).render('404');
    }
};

module.exports = storyController;
