from tourism_app import create_app
from tourism_app.config import Config

app = create_app()


if __name__ == "__main__":
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)