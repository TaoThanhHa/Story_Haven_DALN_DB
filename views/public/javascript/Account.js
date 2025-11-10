document.addEventListener("DOMContentLoaded", function () {
    const profileName = document.getElementById("profileName");
    const profileFullName = document.getElementById("profileFullName");
    const profileUsername = document.getElementById("profileUsername");
    const storyNameElement = document.getElementById("storyName");
    const storyCountElement = document.getElementById("storyCount");
    const workList = document.getElementById("workList");
    const publishedStoriesElement = document.getElementById("publishedStories");
    const draftStoriesElement = document.getElementById("draftStories");
    const commentForm = document.getElementById('commentForm');
    const commentInput = document.getElementById('commentInput');
    const commentsList = document.getElementById('comments');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const tabs = document.querySelectorAll('.tab');
    const sections = document.querySelectorAll('.content__section');
    const editProfileForm = document.getElementById('editProfileForm');

    // Các element mới thêm vào để hiển thị/chỉnh sửa avatar và mô tả
    const profileAvatarMain = document.querySelector('.profile__avatar img'); // Avatar lớn ở đầu trang
    const profileAvatarNavbar = document.querySelector('#navbarDropdownAccount img'); // Avatar nhỏ trên navbar
    const avatarUrlInput = document.getElementById('avatarUrl'); // Input để nhập URL avatar
    const descriptionTextarea = document.getElementById('description'); // Textarea để nhập mô tả
    const profileDescriptionContent = document.getElementById('profileDescriptionContent'); // Chỗ hiển thị mô tả ở tab giới thiệu

    // Function to fetch stories by user ID
    const fetchStories = async () => {
        try {
            const response = await fetch('/api/storiesbyuser');
            const stories = await response.json();

            let publishedCount = 0;
            let draftCount = 0;

            stories.forEach(story => {
                if (story.status === 'complete') {
                    publishedCount++;
                } else {
                    draftCount++;
                }
            });

            publishedStoriesElement.textContent = publishedCount;
            draftStoriesElement.textContent = draftCount;

            storyCountElement.textContent = stories.length;

            workList.innerHTML = ''; // Clear existing content
            stories.forEach(story => {
                const workItem = document.createElement('div');
                workItem.classList.add('work-item');
                workItem.innerHTML = `
                    <a href="/story/${story.id}" class="story-thumbnail-link"> <!-- Link cho ảnh thumbnail -->
                        <img src="${story.thumbnail ? story.thumbnail : '../images/default-thumbnail.png'}" alt="${story.title}">
                    </a>
                    <div class="work-info">
                        <a href="/story/${story.id}" class="story-title-link"> <!-- Link cho tên truyện -->
                            <h4>${story.title}</h4>
                        </a>
                        <p><i class="fas fa-eye"></i> 0 <i class="fas fa-star"></i> 0 <i class="fas fa-list"></i> 0</p>
                        <p class="work-summary">${story.description ? story.description.substring(0, 50) + '...' : 'No description'}</p>
                        <div class="work-tags">
                            <span class="badge bg-secondary">${story.category ? story.category : 'No category'}</span>
                        </div>
                        <p class="text-muted">${story.status === 'complete' ? 'Đã xuất bản' : 'Đã xuất bản'}</p>
                    </div>
                `;
                workList.appendChild(workItem);
            });
        } catch (error) {
            console.error('Error fetching stories:', error);
            workList.innerHTML = '<p>Error loading stories.</p>';
        }
    };

    // Fetch user account info
    fetch("/api/user/account-info")
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("Lỗi:", data.error);
                return;
            }

            profileName.textContent = data.username;
            profileFullName.textContent = data.username;
            profileUsername.textContent = data.username;
            storyNameElement.textContent = data.username;
            document.getElementById("name").value = data.username;
            document.getElementById("email").value = data.email;
            document.getElementById("phone").value = data.phonenumber;

            // Cập nhật các trường mới (avatar và description)
            // Giả định API trả về 'avatar' và 'description'
            const avatarPath = data.avatar && data.avatar !== '' ? data.avatar : '../images/schwi.png'; 
            profileAvatarMain.src = avatarPath;
            profileAvatarNavbar.src = avatarPath;
            avatarUrlInput.value = avatarPath; 

            const userDescription = data.description && data.description !== '' ? data.description : 'Chưa có mô tả.'; 
            descriptionTextarea.value = userDescription === 'Chưa có mô tả.' ? '' : userDescription; 
            profileDescriptionContent.textContent = userDescription; 

            fetchStories(); // Fetch stories after getting user info
        })
        .catch(error => console.error("Lỗi khi lấy dữ liệu tài khoản:", error));

    // Mảng tên người dùng và avatar mẫu (dùng cho bình luận)
    const usernames = ["Alice", "Bob", "Charlie", "David", "Eve", "Schwi", "Shiro", "Izuna"];
    const avatars = ["../images/avt1.jpg", "../images/avt2.jpg", "../images/avt3.jpg", "../images/schwi.png", "../images/nền.jpg", "../images/avt10.jpg"];

    // Hàm tạo ID ngẫu nhiên
    function generateId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // Hàm lấy tên người dùng ngẫu nhiên
    function getRandomUsername() {
        return usernames[Math.floor(Math.random() * usernames.length)];
    }

    // Hàm lấy avatar ngẫu nhiên
    function getRandomAvatar() {
        return avatars[Math.floor(Math.random() * avatars.length)];
    }

    // Hàm tạo phần tử bình luận
    function createCommentElement(commentText, username) {
        const commentId = generateId();
        const comment = document.createElement("li");
        comment.classList.add("comment");
        comment.dataset.commentId = commentId;
        comment.innerHTML = `
            <div class="comments-detail">
                <div class="avt">
                    <img src="${getRandomAvatar()}" alt="Avatar">
                    <div class="nick-name">${username}</div>
                </div>
                <div class="comments-info">${commentText}</div>
                <div class="comments-item">
                    <span class="comment-date">${new Date().toLocaleString()}</span>
                    <div class="comments-symbol">
                        <div class="reply-btn"><i class="fas fa-reply"></i> (<span class="reply-count">0</span>)</div>
                        <div class="delete-btn" style="color: red; cursor: pointer;"><i class="fas fa-trash"></i></div>
                    </div>
                </div>
                <div class="replies" style="display: none;"></div>
                <div class="reply-form" style="display: none;">
                    <form class="reply-form-inner row">
                        <div class="col-10"><textarea type="text" class="reply-input" placeholder="Nhập phản hồi của bạn..." required></textarea></div>
                        <div class="col-2"><button type="submit" class="send-reply"><i class="fas fa-paper-plane"></i></button></div>
                    </form>
                </div>
            </div>
        `;

        const replyBtn = comment.querySelector(".reply-btn");
        const replyCount = comment.querySelector(".reply-count");
        const repliesContainer = comment.querySelector(".replies");
        const replyForm = comment.querySelector(".reply-form");
        const replyInput = replyForm.querySelector(".reply-input");
        const deleteBtn = comment.querySelector(".delete-btn");

        deleteBtn.addEventListener("click", function () {
            if (confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) {
                comment.remove();
            }
        });

        replyBtn.addEventListener("click", function () {
            replyForm.style.display = replyForm.style.display === "none" ? "block" : "none";
        });

        replyForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const replyText = replyInput.value.trim();
            if (replyText === "") return;
            const replyToReply = createReplyElement(replyText,getRandomUsername());
            repliesContainer.appendChild(replyToReply);
            replyForm.style.display = "none";
            replyCount.textContent = parseInt(replyCount.textContent) + 1;
            repliesContainer.style.display = "block";
            replyInput.value = "";
        });
        return comment;
    }

    // Hàm tạo phần tử phản hồi bình luận
    function createReplyElement(replyText, username) {
        const reply = document.createElement("div");
        reply.classList.add("comment", "reply");
        reply.innerHTML = `
            <div class="comments-detail">
                <div class="avt">
                    <img src="${getRandomAvatar()}" alt="Avatar">
                    <div class="nick-name">${username}</div>
                </div>
                <div class="comments-info">${replyText}</div>
                <div class="comments-item">
                    <span class="comment-date">${new Date().toLocaleString()}</span>
                    <div class="comments-symbol">
                        <div class="reply-btn"><i class="fas fa-reply"></i> (<span class="reply-count">0</span>)</div>
                        <div class="delete-btn" style="color: red; cursor: pointer;"><i class="fas fa-trash"></i></div>
                    </div>
                </div>
                <div class="replies" style="display: none;"></div>
                <div class="reply-form" style="display: none;">
                    <form class="reply-form-inner row">
                        <div class="col-10"><textarea type="text" class="reply-input" placeholder="Nhập phản hồi của bạn..." required></textarea></div>
                        <div class="col-2"><button type="submit" class="send-reply"><i class="fas fa-paper-plane"></i></button></div>
                    </form>
                </div>
            </div>
        `;
        const replyBtn = reply.querySelector(".reply-btn");
        const replyCount = reply.querySelector(".reply-count");
        const repliesContainer = reply.querySelector(".replies");
        const replyForm = reply.querySelector(".reply-form");
        const replyInput = replyForm.querySelector(".reply-input");
        const deleteBtn = reply.querySelector(".delete-btn");

        deleteBtn.addEventListener("click", function () {
            if (confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) {
                reply.remove();
            }
        });

        replyBtn.addEventListener("click", function () {
            replyForm.style.display = replyForm.style.display === "none" ? "block" : "none";
        });

        replyForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const replyText = replyInput.value.trim();
            if (replyText === "") return;
            const replyToReply = createReplyElement(replyText,getRandomUsername());
            repliesContainer.appendChild(replyToReply);
            replyForm.style.display = "none";
            replyCount.textContent = parseInt(replyCount.textContent) + 1;
            repliesContainer.style.display = "block";
            replyInput.value = "";
        });
        return reply;
    }

    // Xử lý gửi bình luận
    commentForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const commentText = commentInput.value.trim();
        if (commentText === "") return;
        const username = profileName.textContent || getRandomUsername(); // Get username
        const commentElement = createCommentElement(commentText, username);
        commentsList.appendChild(commentElement);
        commentInput.value = "";
    });

    // Xử lý chuyển đổi tab
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('tab--active'));
            sections.forEach(s => s.classList.remove('content__section--active'));
            tab.classList.add('tab--active');
            const tabId = tab.dataset.tab;
            document.getElementById(tabId).classList.add('content__section--active');
        });
    });

    // Xử lý gửi form chỉnh sửa thông tin cá nhân
    editProfileForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Thu thập dữ liệu từ form
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const avatarUrl = avatarUrlInput.value; // Lấy URL avatar mới
        const description = descriptionTextarea.value; // Lấy mô tả mới

        // Tạo đối tượng JSON để gửi dữ liệu
        const updateData = {
            username: name,
            email: email,
            phone: phone,
            avatar: avatarUrl, // Thêm avatar
            description: description // Thêm description
        };

        try {
            // Gửi yêu cầu PUT đến backend để cập nhật thông tin
            const response = await fetch('/api/user/update-profile', { 
                method: 'PUT', // Hoặc 'POST' tùy thuộc vào API của bạn
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
            const data = await response.json();

            // Xử lý phản hồi
            if (response.ok && data.success) { // Giả sử API trả về { success: true, message: "..." }
                successMessage.textContent = data.message || "Cập nhật thông tin thành công!";
                successMessage.style.display = 'block';
                errorMessage.style.display = 'none';

                // Cập nhật thông tin hiển thị trên trang ngay lập tức
                profileName.textContent = name;
                profileFullName.textContent = name;
                profileUsername.textContent = name;
                storyNameElement.textContent = name;
                
                // Cập nhật avatar trên trang (sử dụng URL từ input, nếu trống thì dùng default)
                profileAvatarMain.src = avatarUrl && avatarUrl !== '' ? avatarUrl : '../images/schwi.png';
                profileAvatarNavbar.src = avatarUrl && avatarUrl !== '' ? avatarUrl : '../images/schwi.png';

                // Cập nhật mô tả ở tab "Giới thiệu" (nếu trống thì dùng default)
                profileDescriptionContent.textContent = description && description !== '' ? description : 'Chưa có mô tả.';

                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
            } else {
                errorMessage.textContent = data.error || 'Có lỗi xảy ra khi cập nhật thông tin.';
                errorMessage.style.display = 'block';
                successMessage.style.display = 'none';
            }
        } catch (error) {
            console.error('Lỗi:', error);
            errorMessage.textContent = 'Có lỗi xảy ra trong quá trình cập nhật thông tin.';
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';
        }
    });
});