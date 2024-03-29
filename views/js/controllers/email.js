'use strict';
angular.module('app').controller('emailController',
['$rootScope', '$scope', '$state', '$stateParams', '$filter', 'resource', '$uibModalInstance', 'growl', 'students', 'room', 'event', 'lab',
function($rootScope, $scope, $state, $stateParams, $filter, resource, $uibModalInstance, growl, students, room, event, lab) {
    var self = this;
    self.nonnull = [];
    self.docDefinition = {
        content: [
            { text: 'Email Log\n\n', style: 'header' }
        ],
        styles: {
            header: { fontSize: 14 },
            message: {fontSize: 11 }
        }
    }

    self.subject = event.name + " Seating Assignment";
    self.recievers = "";

    var dateStr = $filter('date')(event.date, "EEEE, LLLL dd 'at' hh:mm a");
    self.paragraph = "Dear [fullname], \n\n";


    self.paragraph += "Here is your assigned seat for " + event.name + ".\n";
    self.paragraph += "Please arrive early to find your seat.\n";
    self.paragraph += "If you cannot find your seat, please ask for assistance.\n";
    self.paragraph += "We have seating charts available in the front of the classroom.\n\n";
    self.paragraph += event.name + " - " + dateStr + " in " + room + "\n";
    self.paragraph += "Seat: [seat]\n";


    if (!lab) {
        self.paragraph += "Exam Serial Number: [id]\n\n";
        self.paragraph += "Please be sure to put your Exam Serial Number on your exam.\n";
        self.paragraph += "Note: Exam Serial Number may change in future exams\n\n"
        self.paragraph += "See you in class,\nThe CSE 15L Team";
    } else {
        self.paragraph += "\nSee you in lab,\nThe CSE 15L Team";
    }


    self.close = function() {
        $uibModalInstance.close();
    };

    self.generateRecievers = function(students) {
        students = students.filter(function(s) {
            return (!s.isOsd);
        });

        var list = students.sort(self.sortByName);

        for (var i = 0; i < list.length; i++) {
            if (list[i].email) {
                self.recievers += list[i].email;
                if (i < list.length - 1) self.recievers += ",";
                self.nonnull.push(list[i]);
            }
        }
    }

    self.generateRecievers(students);

    /* Comparison functions to sort by lastname */
    self.sortByName = function(stud1, stud2) {
        if (stud1.lastName < stud2.lastName)
            return -1;
        if (stud1.lastName > stud2.lastName)
            return 1;
        if (stud1.lastName == stud2.lastName) {
            if (stud1.firstName < stud2.firstName)
                return -1
            else
                return 1
        }

        return 0;
    }

    self.parse = function(text, student) {
        var fullname = "fullname";
        var id = "id";
        var lastname = "lastname";
        var firstname = "firstname";
        var seat = "seat";

        var parsedText = "";
        var leftBracket = false;
        var rightBracket = false;
        var syntax = ""
        var firstname = ""

        var info = {
            fullname : student.firstName + " " + student.lastName,
            lastname : student.lastName,
            firstname : student.firstName,
            id : student.studentID,
            seat : student.seat.id
        }

        if (info.seat === '') { info.seat = 'No Assigned Seating'; }

        for (var i = 0; i < text.length; i++) {
            if (text[i] == "[") {
                leftBracket = true;
                continue;
            }

            if (text[i] == "]") {
                leftBracket = false;
                parsedText += info[syntax];
                syntax = ""
                continue;
            }

            if (!leftBracket) parsedText += text[i]
            else syntax += text[i]
        }

        return parsedText;
    }

    self.generateFlaggedEmails = function(text) {
        var changeStudents = self.nonnull.filter(function (student) {
          return student.emailFlag;
        });
        var emails = changeStudents.map(function(student) {
            var parsedText = self.parse(text, student);
            self.docDefinition.content.push({text: parsedText, style: 'message'});

            return {
                email: student.email,
                text: parsedText,
                subject: self.subject
            };
        })

        self.total = changeStudents.length;
        self.failed = 0;
        self.sent = 0;
        self.errors = [];
        self.sendEmails(emails);
    }

    self.generateEmails = function(text) {
        var emails = self.nonnull.map(function(student) {
            var parsedText = self.parse(text, student);
            self.docDefinition.content.push({text: parsedText, style: 'message'});

            return {
                email: student.email,
                text: parsedText,
                subject: self.subject
            };
        })

        self.total = self.nonnull.length;
        self.failed = 0;
        self.sent = 0;
        self.errors = [];
        self.sendEmails(emails);
    }

    self.sendEmails = function(emails) {
        self.sending = true;

        //pdfMake.createPdf(self.docDefinition).open();
        emails.map(function(email) {
            resource.emails.sendEmail({email: email},
                function success(res) {
                    self.sent += 1;
                }, function error(err) {
                    self.failed += 1;
                    self.errors.push(email);
                    growl.error('Error sending to ' + email.email);
                });
        });

        growl.success('Emails Sent! ' + self.sent + '/' + emails.length);
    }

    self.retryAll = function(emails) {
        var clone = emails.splice(0);   // clone array
        self.errors = [];
        self.sent -= self.failed;
        self.failed = 0;
        self.sendEmails(clone);
    }

    self.retry = function(email, index) {
        resource.emails.sendEmail({email: email},
            function success(res) {
                self.sent += 1;
                self.failed -= 1;
                self.errors.splice(index,1);
                growl.success('Email Sent!');
            }, function error(err) {
                growl.error('Error sending to ' + email.email);
            }
        );
    }

}]);
