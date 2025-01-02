const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
let balls = [];
const pi = Math.PI;

function make_2d_vector(x, y) {
    vector = {}

    vector.x = x
    vector.y = y
    vector.get_magitude = function() {return (vector.x**2 + vector.y**2)**0.5}
    vector.get_unit = function() {
        magnitude = vector.get_magitude();
        if (magnitude == 0) {return make_2d_vector(0, 0)}
        return make_2d_vector(vector.x/magnitude, vector.y/magnitude)
    }

    return vector
}
let last_data = []
function new_ball(position, velocity, radius, density, color, bounce_efficiency, spininnes) {
    const ball = {};

    ball.position = position //px
    ball.angle = 0 //rad
    ball.radius = Number(radius) //px
    ball.mass = Number(density*ball.radius*ball.radius) //kg
    ball.color = String(color) //#rrggbb
    ball.bounce_efficiency = Number(bounce_efficiency) //0-1
    ball.spininess = Number(spininnes) //0-1
    ball.velocity = velocity //px/s
    ball.angular_velocity = 0 //rad/s
    ball.touching = []

    ball.update = function(time) {
        ball.position.x += ball.velocity.x * time;
        ball.position.y += ball.velocity.y * time;
        ball.angle += ball.angular_velocity * time;
        ball.position.y = Math.max(ball.radius, Math.min(1024-ball.radius, ball.position.y));
        //ball.position.x = Math.max(ball.radius, Math.min(2048-ball.radius, ball.position.x));
    }

    ball.draw = function() {

        context.fillStyle = ball.color;
        const rgb = [
            parseInt(ball.color.slice(0, 2), 16),
            parseInt(ball.color.slice(2, 4), 16),
            parseInt(ball.color.slice(4, 6), 16)
        ];
        const inverted = `#${(255 - rgb[0]).toString(16).padStart(2, '0')}${(255 - rgb[1]).toString(16).padStart(2, '0')}${(255 - rgb[2]).toString(16).padStart(2, '0')}`;
        context.strokeStyle = inverted;

        //circle
        context.beginPath();
        context.arc(ball.position.x, ball.position.y, ball.radius, 0, 2 * pi);
        context.fill();
        context.closePath();
    }

    ball.bounce_off = function (other_ball, temperature) {
        last_data.splice(0, 4)

        let this_ball = JSON.parse(JSON.stringify(ball))

        last_data[4] = this_ball
        last_data[5] = other_ball

        let normal_direction = make_2d_vector(other_ball.position.x - this_ball.position.x, other_ball.position.y - this_ball.position.y).get_unit();
        let tangent_direction = make_2d_vector(normal_direction.y, -normal_direction.x);
        {
            let v = this_ball.velocity
            let d = normal_direction
            let a = (v.x + v.y * d.y / d.x) / (d.x + d.y * d.y / d.x)
            let b = (a * d.y - v.y) / d.x
            this_ball.normal_magnitude = a
            this_ball.tangent_magnitude = b
        }
        this_ball.normal_magnitude *= -temperature;
        ball.velocity.x = this_ball.normal_magnitude * normal_direction.x + this_ball.tangent_magnitude * tangent_direction.x;
        ball.velocity.y = this_ball.normal_magnitude * normal_direction.y + this_ball.tangent_magnitude * tangent_direction.y;

        last_data[6] = this_ball
        last_data[7] = other_ball
    }
    
    balls.push(ball);
    return ball;
}

const time_input = document.querySelector("#time_speed");
const frame_rate_display = document.querySelector("#frame_rate");
const temperture_input = document.querySelector("#temperature");
const pressure_input = document.querySelector("#pressure");
function run_frame() {
    let temperature = Number(temperture_input.value);
    let pressure = Number(pressure_input.value);
    let time_multiplier = 1;

    //frame rate handling
    current_frame_time = Date.now();
    time_passed = (current_frame_time - last_frame_time)/1000;
    last_frame_time = current_frame_time;
    frame_rate_display.innerHTML = Math.round(1/time_passed);

    for (let index1 = 0; index1 < balls.length; index1++) {
        ball1 = balls[index1];
        for (let index2 = 0; index2 < balls.length; index2++) {
            ball2 = balls[index2];

            if (index1 === index2) {continue;}
            //atract
            let distance = Math.sqrt((ball1.position.x - ball2.position.x)**2 + (ball1.position.y - ball2.position.y)**2);
            ball1.velocity.x += (ball2.position.x - ball1.position.x)*time_passed*time_multiplier*pressure / distance;
            ball1.velocity.y += (ball2.position.y - ball1.position.y)*time_passed*time_multiplier*pressure / distance;
            ball2.velocity.x += (ball1.position.x - ball2.position.x)*time_passed*time_multiplier*pressure / distance;
            ball2.velocity.y += (ball1.position.y - ball2.position.y)*time_passed*time_multiplier*pressure / distance;

            //bounce
            says_touching = ball2.touching.includes(index1) || ball1.touching.includes(index2);
            actually_touching = (ball1.position.x - ball2.position.x)**2 + (ball1.position.y - ball2.position.y)**2 < (ball1.radius + ball2.radius)**2;
            
            if (says_touching !== actually_touching) {
                if (actually_touching) {
                    ball1.touching.push(index2);
                    ball2.touching.push(index1);
                    ball1_copy = JSON.parse(JSON.stringify(ball1))
                    ball2_copy = JSON.parse(JSON.stringify(ball2))
                    ball1.bounce_off(ball2_copy, temperature);
                    ball2.bounce_off(ball1_copy, temperature);
                }
                if (says_touching) {
                    ball1.touching.splice(ball1.touching.indexOf(index2), 1);
                    ball2.touching.splice(ball2.touching.indexOf(index1), 1);
                }
            }

            // Calculate the actual distance between the centers
            const actualDistance = Math.sqrt(
                (ball2.position.x - ball1.position.x) ** 2 +
                (ball2.position.y - ball1.position.y) ** 2
            );
            
            // The minimum distance to prevent overlap
            const minDistance = ball1.radius + ball2.radius;
            
            if (actualDistance < minDistance) {
                // Calculate the direction from ball2 to ball1
                const direction = make_2d_vector(
                ball1.position.x - ball2.position.x,
                ball1.position.y - ball2.position.y
                ).get_unit();
            
                // Calculate the overlap distance
                const overlap = minDistance - actualDistance;
            
                // Split the displacement equally between the two balls
                const adjustment = overlap / 2;
            
                // Move ball1 and ball2 in opposite directions
                ball1.position.x += direction.x * adjustment;
                ball1.position.y += direction.y * adjustment;
            
                ball2.position.x -= direction.x * adjustment;
                ball2.position.y -= direction.y * adjustment;
            }
        }
    }

    context.clearRect(0, 0, 2048, 1024);
    for (let index = 0; index < balls.length; index++) {

        ball = balls[index];

        if (ball.position.y - ball.radius <= 0 || ball.position.y + ball.radius >= 1024) {ball.velocity.y *= -1;}

        if (ball.position.x + ball.radius >= 2048 || ball.position.x - ball.radius <= 0) {ball.velocity.x *= -1;}
        ball.draw();
        ball.update(time_passed*time_multiplier);
    }
    requestAnimationFrame(run_frame);
}

let inputs = document.getElementsByClassName("input");
let labels = document.getElementsByClassName("dynamic");
for (let i = 0; i < inputs.length; i++) {
    inputs[i].oninput = function() {
        labels[i].innerHTML = inputs[i].value;
    }
}

const particles = prompt("Pick a number of particles depending on how powerful your computer is. (Recommended: 50-300)")
for (let i = 0; i < particles; i++) {
    const ball = new_ball(make_2d_vector(Math.random()*2048, Math.random()*1024), make_2d_vector(Math.random()*1000-500, Math.random()*1000-500), 1000/particles, 0, "#ff0000", 1, 0);
}

let last_frame_time = Date.now();
run_frame();