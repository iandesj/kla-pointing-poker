import {Component, OnInit} from '@angular/core';
import {DbService} from '../../services/db.service';
import {AuthService} from '../../services/auth.service';
import {StagedUsersComponent} from '../staged-users/staged-users.component';
import {MatDialog} from '@angular/material';
import {Angular2Csv} from 'angular2-csv';

@Component({
  selector: 'app-observer',
  templateUrl: './observer.component.html',
  styleUrls: ['./observer.component.css']
})
export class ObserverComponent implements OnInit {
  points = [
    {text: '0', cols: 1, rows: 1, value: 0},
    {text: '1', cols: 1, rows: 1, value: 1},
    {text: '2', cols: 1, rows: 1, value: 2},
    {text: '3', cols: 1, rows: 1, value: 3},
    {text: '5', cols: 1, rows: 1, value: 5},
    {text: '8', cols: 1, rows: 1, value: 8},
    {text: '13', cols: 1, rows: 1, value: 13},
    {text: '21', cols: 1, rows: 1, value: 21},
    {text: '34', cols: 1, rows: 1, value: 34},
    {text: '55', cols: 1, rows: 1, value: 55},
  ];
  users: any[];
  ticket: string;
  description: string;
  ticketNonce: number;
  votes: any[];
  percentVoted: number;
  pointSum: number;
  consensus: boolean;
  voterCount: number;
  userVotes: any;

  pastTickets: any[];

  stagedUsersDialogOpen: boolean;

  constructor(private _dbService: DbService, private _authService: AuthService, private matDialog: MatDialog) {
    this.percentVoted = 0;
    this.userVotes = {};
    this.pastTickets = [];
    this.stagedUsersDialogOpen = false;
  }

  ngOnInit() {
    this._dbService.readList(this._authService.session + '/users').valueChanges().subscribe(users => {
      this.users = users;
      this.voterCount = this.howManyNonObservers();
    });
    this._dbService.readList(this._authService.session + '/staged').valueChanges().subscribe(stagedUsers => {
      if (!this.stagedUsersDialogOpen && stagedUsers.length > 0) {
        this.openStagedUsersDialog();
      }
    });
    this._dbService.readList(this._authService.session + '/tickets').valueChanges().map(tickets => {
      return tickets.filter((ticket: any) => typeof ticket !== 'number' && ticket.uid);
    }).subscribe(tickets => {
      this.pastTickets = tickets;
    });
    this._dbService.readList(this._authService.session + '/votes').valueChanges().map(votes => {
      let tmpSum = 0;
      let tmpConsensus = false;
      let previousVote;
      this.userVotes = {};
      votes.forEach((vote: any, index: number) => {
        tmpSum += vote.points;
        if (index === 0) {
          tmpConsensus = true;
          previousVote = vote.points;
        } else {
          tmpConsensus = tmpConsensus && previousVote === vote.points;
          previousVote = vote.points;
        }

        if (!this.userVotes[vote.points]) {
          this.userVotes[vote.points] = [];
        }
        this.userVotes[vote.points].push(this.findUserByUID(vote.uid));
      });
      this.pointSum = tmpSum;
      this.consensus = tmpConsensus;
      return votes;
    }).subscribe(votes => {
      this.votes = votes;
      if (this.users.length > 0) {
        this.percentVoted = (this.votes.length / this.voterCount) * 100;
      }
    });
    this._dbService.readProperty(this._authService.session + '/tickets/nonce').valueChanges().subscribe((nonce: number) => {
      this.ticketNonce = nonce === null ? 1 : nonce;
      this._dbService.readProperty(this._authService.session + '/tickets/' + this.ticketNonce).valueChanges()
        .subscribe((currentTicket: any) => {
          if (currentTicket) {
            this.ticket = currentTicket.ticket;
            this.description = currentTicket.description;
          } else {
            this.ticket = '';
            this.description = '';
            this.percentVoted = 0;
            this.votes = [];
            this.pointSum = 0;
            this.userVotes = {};
            this._dbService.setProperty(this._authService.session + '/users/' + this._authService.currentUser.uid + '/hasVoted', false);
          }
        });
    });
  }

  howManyNonObservers() {
    let tmpSum = 0;
    this.users.forEach(user => {
      if (!user.observer) {
        tmpSum++;
      }
    });
    return tmpSum;
  }

  findUserByUID(uid: string) {
    let returnUser;
    this.users.forEach(user => {
      if (user.uid === uid) {
        returnUser = user;
      }
    });
    return returnUser;
  }

  openStagedUsersDialog() {
    this.stagedUsersDialogOpen = true;
    const dialogRef = this.matDialog.open(StagedUsersComponent, {
      width: '35%',
      height: '35%'
    });
    dialogRef.afterClosed().subscribe(result => {
      this.stagedUsersDialogOpen = false;
    });
  }

  exportPastTickets() {
    if (this.pastTickets) {
      const headers = ['Consensus Points', 'Description', 'Ticket', 'Order Number'];
      new Angular2Csv(this.pastTickets, 'Pointing Results for Session ' + this._authService.session + ' - ' + new Date().toLocaleDateString('en-us'), {headers: headers});
    }
  }
}
