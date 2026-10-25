import assert from "node:assert/strict";
import test from "node:test";
import { parseFriendPaste } from "../src/utils/friend-paste.ts";

// Kurone 默认表单里启用的字段
const fields = [
	{ key: "title", label: "站点名称", type: "text", maxLength: 60 },
	{ key: "siteurl", label: "站点地址", type: "url", maxLength: 300 },
	{ key: "imgurl", label: "头像地址", type: "url", maxLength: 300 },
	{ key: "email", label: "联系邮箱", type: "email", maxLength: 254 },
	{ key: "desc", label: "站点简介", type: "text", maxLength: 200 },
];
const site = {
	title: "白音的小站",
	siteurl: "https://shirone.example.com",
	imgurl: "https://shirone.example.com/avatar.webp",
	desc: "记录代码、相机和生活",
};

const formats = {
	"labelled lines": "站点名称：白音的小站\n站点地址：https://shirone.example.com\n头像：https://shirone.example.com/avatar.webp\n简介：记录代码、相机和生活",
	"English labels": "Name: 白音的小站\nLink: https://shirone.example.com\nAvatar: https://shirone.example.com/avatar.webp\nDescription: 记录代码、相机和生活",
	JSON: JSON.stringify(site, null, 2),
	"a friends.ts entry": '\t{\n\t\ttitle: "白音的小站",\n\t\tsiteurl: "https://shirone.example.com",\n\t\timgurl: "https://shirone.example.com/avatar.webp",\n\t\tdesc: "记录代码、相机和生活",\n\t},',
	YAML: "- name: 白音的小站\n  link: https://shirone.example.com\n  avatar: https://shirone.example.com/avatar.webp\n  descr: 记录代码、相机和生活",
	"Markdown list": "- **名称**：白音的小站\n- **地址**：https://shirone.example.com\n- **头像**：https://shirone.example.com/avatar.webp\n- **简介**：记录代码、相机和生活",
	"bare lines": "白音的小站\nhttps://shirone.example.com\nhttps://shirone.example.com/avatar.webp\n记录代码、相机和生活",
};

for (const [name, text] of Object.entries(formats)) {
	test(`parseFriendPaste reads ${name}`, () => {
		assert.deepEqual(parseFriendPaste(text, fields), site);
	});
}

test("parseFriendPaste picks up emails and the friend link page on the same site", () => {
	const all = [...fields, { key: "backlinkUrl", label: "友链所在页面", type: "url", maxLength: 300 }];
	assert.deepEqual(
		parseFriendPaste("白音的小站\nhttps://shirone.example.com\nhttps://shirone.example.com/friends/\nhi@shirone.example.com", all),
		{ title: "白音的小站", siteurl: "https://shirone.example.com", backlinkUrl: "https://shirone.example.com/friends/", email: "hi@shirone.example.com" },
	);
});

test("parseFriendPaste adds https:// to a bare domain and drops values of the wrong kind", () => {
	assert.deepEqual(parseFriendPaste("地址：shirone.example.com\n头像：没有\n邮箱：not-an-email", fields), { siteurl: "https://shirone.example.com" });
});

test("parseFriendPaste matches custom fields by their label", () => {
	const custom = [...fields, { key: "x_rss", label: "RSS 地址", type: "url", maxLength: 300 }];
	assert.deepEqual(parseFriendPaste("名称：白音的小站\nRSS 地址：https://shirone.example.com/rss.xml", custom), {
		title: "白音的小站",
		x_rss: "https://shirone.example.com/rss.xml",
	});
});

test("parseFriendPaste does not guess from a message or unknown labels", () => {
	assert.deepEqual(parseFriendPaste("你好，我想和你交换友链～", fields), {});
	assert.deepEqual(parseFriendPaste("QQ: 12345\nhttps://shirone.example.com", fields), { siteurl: "https://shirone.example.com" });
	assert.equal(parseFriendPaste(`名称：${"长".repeat(80)}`, fields).title.length, 60);
});
