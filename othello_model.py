import pickle
import mysql.connector
import othello
from othello_restapi import app
from random import randint

class GameNotFoundError(BaseException):
    pass

class GameAlreadyStoredError(BaseException):
    pass

class BoardStore():
    def __init__(self):
        self.db_conn = mysql.connector.connect(user=app.config['DATABASE_USER'],
                                            password=app.config['DATABASE_PASSWORD'],
                                            database=app.config['DATABASE_NAME'],
                                            host=app.config['DATABASE_HOST'],
                                            autocommit=True)
    
    def __del__(self):
        if getattr(self, 'db_conn', None):
            cls.db_conn.close()
    
    class Closing():
        def __init__(self, cursor):
            self.cur = cursor
        def __enter__(self):
            return self.cur
        def __exit__(self, type, value, traceback):
            if getattr(self, 'cur', None):
                self.cur.execute('UNLOCK TABLES')
                self.cur.close()
                
    
    def get_board(self, game_key, move_id):
        #cur = self.db_conn.cursor()
        with self.Closing(self.db_conn.cursor()) as cur:
            cur.execute('UPDATE othello_data SET `last_hit`=NOW(6) where `game_key`=%s and move_id=%s', (game_key, move_id))
            cur.execute('SELECT `game` FROM othello_data WHERE game_key=%s and move_id=%s', (game_key, move_id))
            result = cur.fetchall()
            if len(result)==0:
                raise GameNotFoundError
            return pickle.loads(result[0][0])
        
        
    def save_board(self, board):
        if board.game_key is not None and board.move_id is not None:
            raise GameAlreadyStoredError
        with self.Closing(self.db_conn.cursor()) as cur:
            cur.execute('LOCK TABLES othello_data WRITE')
            if board.game_key is None:
                cur.execute('SELECT `game_key` FROM othello_data')
                results = cur.fetchall()
                game_key = randint(10000, 99999)
                while (game_key, ) in results:
                    game_key = randint(10000, 99999)
                board.move_id = 0
                board.game_key = str(game_key)
            else:
                cur.execute('SELECT MAX(move_id) FROM othello_data WHERE game_key=%s', (board.game_key,))
                results = results = cur.fetchall()
                if len(results):
                    board.move_id = results[0][0]+1
                else:
                    # arrive here if saving a board for which game_key is already set, yet
                    # no matching games found stroed in the db - this indicates an error
                    raise GameNotFoundError
            cur.execute('INSERT INTO othello_data (game_key, move_id, game) VALUES (%s, %s, %s)', (board.game_key, board.move_id, pickle.dumps(board)))
            cur.execute('UNLOCK TABLES')
            

class OthelloBoardModel(othello.OthelloBoardClass):
    game_key = None
    move_id = None
    last_move_id = None
    
    def play_move(self, x, y, test_only=False):
        result = super().play_move(x, y, test_only)
        if not test_only:
            self.last_move_id = self.move_id
            self.move_id = None
        return result
        
        
    
    