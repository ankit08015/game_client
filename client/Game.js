import React, {Component} from 'react';
import axios from 'axios';
import * as $ from 'jquery'

class Game extends Component {

  constructor(props) {
    super(props)

    this.state = {
      gridSize: {
        x: 15,
        y: 15
      },
      traps: [],
      deTraps: [],
      followDetrapCells: [],
      user: {},
      showtraps: false,
      win: false,
      instructions: '',
      messages: [],
      messageNumber: 0,
      hideAll: false
    }
  }

  componentDidMount() {
    this.setUser()
    this.setMessages()
  }

  hideAll() {
    let hideAll = this.state.hideAll || false;
    this.setState({hideAll: !hideAll});
  }

  setMessages() {
    let messages = [
      {message: 'Welcome to battle field', interval: 50},
      {message: 'You are here to find the traps set by your enimies', interval: 4000}
    ]
    this.setState({messages: messages}, () => {
      this.botMessages()
    })
  }

  nextMessage() {
    let messageNumber = this.state.messageNumber || 0;
    messageNumber++;
    this.setState({messageNumber: messageNumber});
  }

  botMessages() {
    let messageNumber = this.state.messageNumber;
    let messages = this.state.messages;
    setTimeout(() => {
      this.setState({instructions: messages[messageNumber]['message']}, () => {
        this.nextMessage()
      })
    }, messages[messageNumber]['interval']);
  }

  setUser() {
    try {
      this.getUser(() => {
        // this.gettraps()
        this.loadTraps();
        this.getDetraps();
      });
    }
    catch(e) {
      console.log(e);
      window.location.replace("/");
    }
  }

  onClickCell(x, y) {
    let traps = this.state.traps;
    let trap = {x: x, y: y};
    let trap_index = traps.findIndex(t => t.x == x && t.y == y)
    if (trap_index < 0) {
      traps.push(trap);
      this.createTrap(trap).bind(this);
    }
    // this.setState({traps: traps})
  }

  onClickDetrap(event, x, y) {
    event.target.classList.remove('trap-cell-fail')
    if (this.state.showTraps) {
      alert("Game finished")
      this.logout()
      return;
    }
    let followDetrapCells = this.state.followDetrapCells
    let trap = {x: x, y: y};
    if (this.trapExist(trap)) {
      this.createDetrap(trap);
    }
    followDetrapCells.push(trap)
    this.setState({followDetrapCells: followDetrapCells})
  }

  getUser(callback) {
    let user = JSON.parse(localStorage['user']);
    axios.get(`http://localhost:5000/users/${user['id']}`)
      .then(res => {
        const u = res.data;
        if (u) {
          localStorage['user'] = JSON.stringify(u);
          axios.defaults.headers.common['Authorization'] = u['api_token'];
          this.setState({user: u});
        }
        if (callback) {
          callback()
        }
      })
  }

  logout() {
    localStorage['user'] = null;
    this.setUser()
  }

  gettraps() {
    let user = JSON.parse(localStorage['user']);
    axios.get(`http://localhost:5000/traps/${user['role']}`)
      .then(res => {
        const traps = res.data;
        if (traps) {
          this.setState({traps: traps});
        }
      })
  }

  loadTraps() {
    let user = JSON.parse(localStorage['user']);
    let role = 'hero';
    if (user['role'] == 'hero') {
      role = 'villian';
    }
    axios.get(`http://localhost:5000/traps/${role}`)
      .then(res => {
        const traps = res.data;
        if (traps) {
          if (Array.isArray(traps) && traps.length < 1) {
            this.generateGame().bind(this)
          }
          this.setState({traps: traps});
        }
        else {
          this.generateGame().bind(this)
        }
      })
  }

  createTrap(trap) {
    axios.post(`http://localhost:5000/create_trap`, trap)
      .then(res => {
        const traps = res.data;
        this.gettraps()
      })
  }

  trapExist(trap) {
    let traps = this.state.traps;
    let findTrap = traps.findIndex(t => t.x == trap.x && t.y == trap.y)
    if (findTrap < 0) {
      return false;
    }

    return true;
  }


  getDetraps() {
    let user = JSON.parse(localStorage['user']);
    axios.get(`http://localhost:5000/detraps/${user['role']}`)
      .then(res => {
        const traps = res.data;
        if (traps) {
          let state = {deTraps: traps}
          this.setState(state, () => {
            this.checkWin();
          });
        }
      })
  }

  createDetrap(trap) {
    let deTrap = this.state.deTraps || [];
    let findDetrap = deTrap.findIndex(d => d.x == trap.x && d.y == trap.y);
    if (!this.trapExist(trap) || findDetrap > -1) {
      return;
    }
    axios.post(`http://localhost:5000/create_detrap`, trap)
      .then(res => {
        const traps = res.data;
        this.getDetraps()
      })
  }

  showTraps(status) {
    this.setState({showTraps: true}, () => {
      axios.post(`http://localhost:5000/finish_game`, {})
        .then(res => {
          const traps = res.data;
        })
    })
  }

  generateGame() {
    axios.post(`http://localhost:5000/generate_game`, {})
      .then(res => {
        const traps = res.data;
        this.loadTraps()
      })
  }

  checkWin() {
    let traps = this.state.traps;
    let deTraps = this.state.deTraps;
    if (Array.isArray(traps) && Array.isArray(deTraps) && traps.length != 0 && traps.length == deTraps.length) {
        this.setState({win: true, showTraps: true}, () => {
          alert("You Won!");
        })
    }
  }

  render() {

    return (
      <div>
        <div>
          {this.renderTable()}
          {this.state.hideAll ? '' : (
            <div>
              {this.renderUserDetails()}
              {this.state.showTraps ? '' : this.renderFinish()}
              {this.renderNotifications()}
              {this.renderStats()}
            </div>
          )}
          {this.renderHideAll()}
        </div>
      </div>
    )
  }

  renderTable() {
    return (
      <table className="game-table">
        {this.renderTableBody()}
      </table>
    )
  }

  renderTableBody() {
    let gridSize = this.state.gridSize;
    let deTraps = this.state.deTraps;
    let traps = this.state.traps;
    let rows_cell = [];

    for (let i=0; i<=gridSize.y; i++) {
      let cols_cell = [];
      for (let j=0; j<=gridSize.x; j++) {

        let detrap_index = deTraps.findIndex(t => t.x == j && t.y ==i)
        let trap_index = traps.findIndex(t => t.x == j && t.y ==i)

        let trap_class = ''
        if (!this.state.showTraps) {
          trap_class = `game-cell-hover c-pointer`
        }
        if (this.state.showTraps && trap_index > -1) {
          trap_class = `${trap_class} trap-cell`
        }
        if (detrap_index > -1) {
          trap_class = 'trap-cell-success'
        }

        let c = (
          <td key={j} data-x={j} data-y={i} className={`game-cell ${trap_class}`} onClick={(event) => this.onClickDetrap(event, j, i) }></td>
        )

        cols_cell.push(c);
      }
      let r = (
        <tr key={i} className="game-row">{cols_cell}</tr>
      );
      rows_cell.push(r)
    }

    return (
      <tbody className="game-body">
        {rows_cell}
      </tbody>
    )
  }

  renderUserDetails() {
    let user = this.state.user
    return (
      <div className="user-details">
        <div className="bg-light m-4 rounded shadow">
          <div className="px-3 py-2">
            <div><span className="text-primary">{user['name']}</span><small className="bg-secondary text-light px-2 py-1 rounded ml-1">{user['role']}</small></div>
            <div className="py-1 px-2 bg-primary text-white shadow rounded my-1 mt-2"><small>{user['api_token']}</small></div>
          </div>
          <div className="btn-danger text-center px-2 py-1 rounded-bottom c-pointer" onClick={this.logout.bind(this)}>
            Logout
          </div>
        </div>
      </div>
    )
  }

  renderFinish() {
    let styles = {
      position: 'fixed',
      bottom: 0,
      right: 0,
    }
    return (
      <div style={styles}>
        <div className="btn-primary rounded px-4 py-2 m-4 h2 shadow c-pointer" onClick={() => this.showTraps(true)}>
          Finish
        </div>
      </div>
    )
  }

  renderStats() {
    let styles = {
      position: 'fixed',
      bottom: 0,
      left: 0,
    }
    let traps = this.state.traps.length;
    let detraps = this.state.deTraps.length;
    return (
      <div style={styles}>
        <div className="btn-light rounded p-2 m-4 shadow c-pointer">
          <small>
            <span className="bg-dark text-light px-1 py-1 rounded">Total traps - {traps}</span>
            <span className="bg-success text-light px-1 py-1 rounded ml-2">Traps Defused- {detraps}</span>
            <span className="bg-danger text-light px-1 py-1 rounded ml-2">Traps Remaining- {traps - detraps}</span>
          </small>
        </div>
      </div>
    )
  }

  renderNotifications() {
    let styles = {
      position: 'fixed',
      top: 0,
      right: 0,
      maxWidth: '300px'
    }
    let instructions = this.state.instructions
    if (!instructions) {
      return '';
    }
    return (
      <div style={styles}>
        <div className="btn-light rounded px-4 py-2 m-4 shadow c-pointer fade-in" onClick={() => this.showTraps(true)}>
          {this.state.instructions}
        </div>
      </div>
    )
  }

  renderHideAll() {
    let text = 'Hide Everything'
    if (this.state.hideAll) {
      text = 'Show All'
    }
    let styles = {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0
    }

    return (
        <div className="text-center my-3" style={styles}>
          <small><a className="text-light c-pointer" onClick={this.hideAll.bind(this)}>{text}</a></small>
        </div>
    )

  }
}


export default Game;
