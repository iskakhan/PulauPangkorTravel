from flask import Blueprint, render_template

page_blueprint = Blueprint("pages", __name__)


@page_blueprint.get("/")
def index():
    return render_template("index.html")
