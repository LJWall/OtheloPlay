function boardItem(status, x, y) {
    self = this;
    self.status = ko.observable(status);
    self.x = ko.observable(x);
    self.y = ko.observable(y);
    self.mouseOver = ko.observable(false);
};


function OthelloModelView() {
    var self = this;
    var URIs;
    
    // Board state
    self.board = ko.observableArray();
    for (i=0; i<6; i++) {
        for (j=0; j<6; j++) {
            self.board.push(new boardItem('', i, j));
        }
    }
    self.game_complete = ko.observable(false);
    self.current_turn = ko.observable();
    self.pieceSize = ko.observable(500/6);
    self.boardSize = ko.observable(6);
    self.boardLoaded = ko.observable(false);
    self.showPlays = ko.observable(false);
    
    // Score board info
    self.blackScore = ko.observable();
    self.whiteScore = ko.observable();
    self.blackToPlay = ko.observable();
    self.gameComplete = ko.observable(false);

    //Message and warning info
    var defaultMsgText = 'To save a game and return to it latter just bookmark the page.  Should you wish to amend a move (or two) use the browser back button.';
    var defaultMsgClass = 'alert alert-info';
    self.msgText = ko.observable(defaultMsgText);
    self.msgClass = ko.observable(defaultMsgClass);
    
    // New game option
    self.boardSizeOptions = [{size: 6, text: '6 x 6'}, {size: 8, text: '8 x 8'}, {size: 10, text: '10 x 10 (for the committed)'}];
    self.newGameSize = ko.observable(self.boardSizeOptions[1]);
    
    self.processResponse = function(data){
        self.loadResponse(data);
        if (data['current_turn']=='O' && !data['game_complete']) {
            $.ajax(data.URIs.play, {
                    data: ko.toJSON({play: 'auto'}),
                    type: "post", contentType: "application/json",
                    success: self.processResponse
                });
        }
    };
    
    
    self.loadResponse = function(data) {
        URIs = data.URIs;
        self.game_complete(data.game_complete);
        self.current_turn(data.current_turn);
        self.boardSize(data.board.length);
        self.board.removeAll(data.board.length);
        for (i=0; i<data.board.length; i++) {
            for (j=0; j<data.board.length; j++) {
                self.board.push(new boardItem(data.board[i][j], i, j));
            }
        }
        self.pieceSize(500/data.board.length);
        blackScore=0;
        whiteScore=0;
        for (i=0; i<data.board.length; i++) {
            for (j=0; j<data.board.length; j++) {
                if (data['board'][i][j]=='X') {
                    blackScore += 1;
                }
                if (data['board'][i][j]=='O') {
                    whiteScore += 1;
                }
            }
        }
        self.blackScore(blackScore);
        self.whiteScore(whiteScore);
        
        if (data['game_complete']) {
            if (self.blackScore() > self.whiteScore()) {
                self.msgText('Congratulations! You won by ' + String(self.blackScore() - self.whiteScore()) + ' points.');
                self.msgClass('alert alert-success');
            } else if (self.blackScore() < self.whiteScore()) {
                self.msgText('Game over. Computer won by ' + String(self.whiteScore() - self.blackScore()) + ' points.');
                self.msgClass('alert alert-danger');
            } else {
                self.msgText('It\' a draw..');
                self.msgClass('alert alert-warning');
            }
        }
        else {
            self.msgText(defaultMsgText);
            self.msgClass(defaultMsgClass);
        }
        self.boardLoaded(true);
        location.hash = URIs.get;
    };
    
    self.getPieceColour = function(piece) {
        switch(piece.status()) {
            case 'X':
                return 'rgb(0,0,0)';
            case 'O':
                return 'rgb(200,200,200)';
        }
        if (piece.mouseOver() && !self.game_complete()) {
            if (self.current_turn()=='X') {
                return 'rgb(0,50,0)';
            }
            else {
                return 'rgb(150,200,150)';
            }
        }
        if (piece.status()=='P' && self.showPlays()) {
            return 'rgb(0,75,0)';
        }
        return 'rgb(0,100,0)';
    };
    
    self.clickPiece = function(b_item, event) {
        if (self.boardLoaded() && !self.game_complete()) {
            if (b_item.status()=='P') {
                self.msgText(defaultMsgText);
                self.msgClass(defaultMsgClass);
                $.ajax(URIs.play, {
                    data: ko.toJSON({play: [b_item.x(), b_item.y()]}),
                    type: "post", contentType: "application/json",
                    success: self.processResponse
                });
            }
            else {
                self.msgText('Invalid move');
                self.msgClass('alert alert-danger');
            }
        }
        
    };
    

    self.newGame = function() {
        $.ajax('/game', {
                    data: ko.toJSON({game_size: self.newGameSize()['size']}),
                    type: "post", contentType: "application/json",
                    success: self.processResponse
                });
    };
    
    sammyApp = Sammy(function() {
        this.get(/\#(.*)/, function() {
                if (!self.boardLoaded() || this.params['splat'] != URIs.get) {
                    $.getJSON(this.params['splat'], self.loadResponse);   
                }
            });
        });
    sammyApp.run();
    
}

ko.applyBindings(new OthelloModelView());