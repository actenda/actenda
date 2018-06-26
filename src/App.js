import * as ReactDOM from 'react-dom';
import * as React from 'react';

import GoogleLogin from 'react-google-login-button';
import Dropzone from 'react-dropzone';

import jq from 'cheerio'

import LaddaButton, { S } from 'react-ladda';
import Button from '@material/react-button/dist';


const location = 'Parc des Tuileries - CS 80117, 69578 Limonest';
const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const CLIENT_ID = '173021400507-lmgao5drfmu35412d3m0g9mb4865h14g.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDOsmQW75JYK3AmtKl-UjapDAvALUGY_ys';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar";


export default class App extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  onFileLoad(e) {
    const contents = e.target.result;

    const $ = jq.load(contents);
    const data = [];

    $('tr.tblRow').each(function (index, el) {
      const skill = $(this).find('th')[0].children[0].data;
      if (!skill || skill.trim() === '') {
        return;
      }

      const [dh] = $(this).find('td');
      const [date, br, img, time, swapableTime] = dh.children;

      data.push([skill, date.data, (swapableTime && swapableTime.children[1]) ? swapableTime.children[1].children[0].data : time.data]);
    });

    const events = data.map(([skill, date, time]) => {
      const [omit, day, monthName, year] = date.split(' ');
      const [start, end] = time.split('-').map(el => el.trim().split(':'))

      const month = months.indexOf(monthName);

      const shiftStart = new Date(year, month, day, start[0], start[1]);
      const shiftEnd = new Date(year, month, day, end[0], end[1]);

      return {
        'summary': skill,
        'location': location,
        'start': {
          'dateTime': shiftStart.toJSON(),
        },
        'end': {
          'dateTime': shiftEnd.toJSON(),
        },
        'reminders': {
          'useDefault': false,
          'overrides': [
            { 'method': 'popup', 'minutes': 20 },
          ],
        },
      }
    })
    this.setState({ events });
  }

  onFileDrop([file]) {
    const reader = new FileReader();
    reader.onload = this.onFileLoad.bind(this);
    reader.readAsText(file);
  }

  initClient() {
    gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES
    }).then(() => {
        gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSigninStatus.bind(this));

        this.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    });
  }
  
  updateSigninStatus (isSignedIn) {
    this.setState({isSignedIn});
  }
  
  loadGAPI() {
    gapi.load('client:auth2', this.initClient.bind(this));
  }

  componentDidMount() {
    const meta = document.createElement('meta');
    meta.name = "google-signin-client_id";
    meta.content = CLIENT_ID;
    document.getElementsByTagName('head')[0].appendChild(meta);
    this.loadGAPI();
  }

  onImport() {
    if (this.state.loading) {
      return;
    }

    this.setState({ loading: true })

    const queue = this.state.events.map((event, index, { length }) => {
      return () => {
        return new Promise((resolve, reject) => {
          var request = window.gapi.client.calendar.events.insert({
            'calendarId': 'primary',
            'resource': event
          });

          request.execute((event) => {
            this.setState({ progress: index / length })
            resolve();
          });
        })
      }
    });

    queue.reduce((acc, fn) => acc.then(() => fn()), Promise.resolve()).then(() => {
      this.setState({ loading: false })
    })

  }

  signIn () {
    gapi.auth2.getAuthInstance().signIn();
  }

  logout () {
    gapi.auth2.getAuthInstance().signOut();
  }

  render() {
    const { loading, progress, isSignedIn } = this.state;
    return <div className="main">
      <div className="mainContainer">
        <div className="login-button">
        <Button class="mdc-button" onClick={isSignedIn ? this.logout : this.signIn} raised>
          {isSignedIn ? "Déconnexion" : "Connexion"]
        </Button>
        </div>
        <div className="dropzone">
          <div className="events">
            {this.state.events ? this.state.events.map((event) => {
              return <div className="event">
                <span className="name">{event.summary}</span>
                <span className="date">{new Date(event.start.dateTime).toLocaleDateString()}</span>
                <span className="start">{new Date(event.start.dateTime).toLocaleTimeString().slice(0, 5)} - {new Date(event.end.dateTime).toLocaleTimeString().slice(0, 5)}</span>
              </div>
            }) : null}
          </div>
          {this.state.events ? <LaddaButton data-size={S} loading={loading} progress={progress} onClick={this.onImport.bind(this)} >Importer</LaddaButton> : null}
          <Dropzone onDrop={this.onFileDrop.bind(this)}> <div className="dz-ph">Déposer le fichier ici</div> </Dropzone>
        </div>
      </div>
    </div>
  }
}
